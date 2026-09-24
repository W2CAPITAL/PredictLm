"""Optional CPU service; the browser classifier does not require this service."""
import hmac
import io
import os
import threading
import time
import warnings
from flask import Flask, jsonify, request
from PIL import Image, ImageOps
from adapters import BACKENDS, FACTORIES

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024 + 16384
Image.MAX_IMAGE_PIXELS = 24_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
models = {}
lock = threading.Lock()

@app.before_request
def authorize():
    token = os.environ.get('ANIMAL_VISION_TOKEN', '')
    if not token or not hmac.compare_digest(request.headers.get('Authorization',''), 'Bearer ' + token):
        return jsonify(error='Unauthorized'), 401

@app.get('/health')
def health():
    return jsonify(adapters=[dict(id=name, available=name in models) for name in BACKENDS])

@app.post('/predict')
def predict():
    backend = request.form.get('backend')
    if backend not in models:
        return jsonify(error='Model unavailable'), 503
    file = request.files.get('file')
    if not file or file.mimetype not in ('image/jpeg','image/png','image/webp'):
        return jsonify(error='Invalid image'), 400
    if not lock.acquire(blocking=False):
        return jsonify(error='Busy'), 429
    try:
        raw = file.read(8*1024*1024+1)
        if len(raw)>8*1024*1024:
            return jsonify(error='Image too large'), 413
        image = Image.open(io.BytesIO(raw))
        if image.format not in ('JPEG','PNG','WEBP') or image.width*image.height>24_000_000:
            return jsonify(error='Invalid image'), 400
        image = ImageOps.exif_transpose(image).convert('RGB')
        start = time.perf_counter()
        result = models[backend].predict(image)
        return jsonify(backend=backend, model=backend, predictions=result, elapsedMs=round((time.perf_counter()-start)*1000))
    except Exception:
        return jsonify(error='Image decoding or inference failed'), 422
    finally:
        lock.release()

# Load only explicitly selected models; unavailable weights never produce fake results.
for name in os.environ.get('ANIMAL_BACKENDS','').split(','):
    name = name.strip()
    if name not in FACTORIES:
        continue
    try:
        models[name] = FACTORIES[name]()
    except Exception as error:
        app.logger.warning('Model %s unavailable: %s', name, type(error).__name__)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8765, debug=False)
