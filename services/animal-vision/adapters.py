"""Independent inference adapters for the three user-selected animal classifiers.
Models are operator-provided; never deserialize model uploads from HTTP requests.
"""
import json
import os
from pathlib import Path
import numpy as np

BACKENDS = ('hog-svm', 'pytorch-resnet', 'keras-resnet')


def artifact(backend, name):
    root = Path(os.environ.get('ANIMAL_MODEL_ROOT', './models')).resolve()
    path = (root / backend / name).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError('Model artifact unavailable')
    with path.open('rb') as stream:
        if stream.read(80).startswith(b'version https://git-lfs.github.com/spec'):
            raise ValueError('Git LFS pointer found; download the actual model weights')
    return path


def predictions(labels, scores):
    values = np.asarray(scores, dtype=float).reshape(-1)
    if len(labels) != len(values) or not np.isfinite(values).all() or (values < 0).any() or (values > 1).any():
        raise ValueError('Invalid model probabilities or label mapping')
    return [dict(label=str(labels[i]), score=float(values[i]), animal=str(labels[i]).lower() not in ('human', 'natural', 'background'))
            for i in np.argsort(-values)[:5]]


class HogSvm:
    def __init__(self):
        # Legacy pickle can execute code. Only explicitly trusted administrator artifacts.
        if os.environ.get('ANIMAL_TRUST_LEGACY_PICKLE') != '1':
            raise ValueError('Explicit trust required for legacy pickle artifacts')
        import pickle
        with artifact('hog-svm', 'model.pkl').open('rb') as f:
            self.model = pickle.load(f)
        with artifact('hog-svm', 'scaler.pkl').open('rb') as f:
            self.scaler = pickle.load(f)

    def predict(self, image):
        from skimage.transform import resize
        from skimage.color import rgb2gray
        from skimage.feature import hog
        rgb = (resize(np.asarray(image.convert('RGB')), (80, 80)) * 255).astype(np.uint8)
        features = hog(rgb2gray(rgb), orientations=9, pixels_per_cell=(8, 8), cells_per_block=(3, 3))
        scores = self.model.predict_proba(self.scaler.transform(features.reshape(1, -1)))[0]
        return predictions(self.model.classes_, scores)


class TorchResnet:
    def __init__(self):
        import torch
        from torch import nn
        from torchvision import models, transforms
        self.torch = torch
        torch.set_num_threads(1)
        mapping = json.loads(artifact('pytorch-resnet', 'labels.json').read_text())
        self.labels = [mapping[str(i)] for i in range(len(mapping))]
        checkpoint = torch.load(artifact('pytorch-resnet', 'model.pth'), map_location='cpu', weights_only=True)
        state = checkpoint.get('model_state_dict', checkpoint)
        width = int(state['fc.0.weight'].shape[1])
        factory = {512: models.resnet18, 2048: models.resnet50}.get(width)
        if factory is None or int(state['fc.8.weight'].shape[0]) != len(self.labels):
            raise ValueError('Unsupported architecture or label mapping mismatch')
        self.model = factory(weights=None)
        h1, h2 = int(state['fc.0.weight'].shape[0]), int(state['fc.4.weight'].shape[0])
        self.model.fc = nn.Sequential(nn.Linear(width,h1),nn.ReLU(),nn.BatchNorm1d(h1),nn.Dropout(.5),
                                      nn.Linear(h1,h2),nn.ReLU(),nn.BatchNorm1d(h2),nn.Dropout(.4),nn.Linear(h2,len(self.labels)))
        self.model.load_state_dict(state, strict=True)
        self.model.eval()
        self.transform = transforms.Compose([transforms.Resize(256),transforms.CenterCrop(224),transforms.ToTensor(),
                                              transforms.Normalize([.485,.456,.406],[.229,.224,.225])])

    def predict(self, image):
        with self.torch.inference_mode():
            scores = self.model(self.transform(image.convert('RGB')).unsqueeze(0)).softmax(-1)[0].numpy()
        return predictions(self.labels, scores)


class KerasResnet:
    def __init__(self):
        from tensorflow.keras.models import load_model
        self.model = load_model(artifact('keras-resnet', 'model.keras'), compile=False, safe_mode=True)
        if self.model.output_shape[-1] != 3:
            raise ValueError('Expected cat/dog/snake classifier')

    def predict(self, image):
        from tensorflow.keras.applications.resnet50 import preprocess_input
        # Match Program/main.py: RGB 256x256, then Keras ResNet50 preprocessing.
        pixels = np.asarray(image.convert('RGB').resize((256,256), resample=0), dtype=np.float32)
        scores = self.model.predict(preprocess_input(pixels[None,...]), verbose=0)[0]
        return predictions(['Cat','Dog','Snake'], scores)


FACTORIES = {'hog-svm':HogSvm,'pytorch-resnet':TorchResnet,'keras-resnet':KerasResnet}
