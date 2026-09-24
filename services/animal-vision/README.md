# Optional animal model service

The app's **Visão → No navegador** runs a quantized MobileNet CPU/WASM worker; no Python server or paid API is required. First use downloads the pinned model; cached weights can be reused while the app is open/offline. This is classification of the whole image, not object detection or a guarantee of species. Scores remain unmodified; non-animal ImageNet classes are retained. A desktop/server service is optional for the three specifically requested models.

## Three adapters

| Adapter | Source | Required operator artifacts | Preprocessing |
| --- | --- | --- | --- |
| `hog-svm` | https://github.com/KamgangAnthony/Animal-Recognition-Image-Processing3 | `hog-svm/model.pkl`, `hog-svm/scaler.pkl` | RGB 80² → uint8 → grayscale → HOG 9/8/3 → scaler → SVM |
| `pytorch-resnet` | https://github.com/rt75272/Animals | `pytorch-resnet/model.pth`, `pytorch-resnet/labels.json` (idx_to_class) | Resize 256 → center crop 224 → ImageNet normalization → ResNet18/50 with matching MLP head |
| `keras-resnet` | https://github.com/AlvaroVasquezAI/Animal_Image_Classification | `keras-resnet/model.keras` | RGB 256² → Keras ResNet50 preprocess_input; cat, dog, snake order |

Inspected 2026-09-24: rt75272 has **15** labels in its current idx_to_class file, despite the README advertising 150+, and has no trained checkpoint in Git. Álvaro's model paths are Git LFS pointers: obtain actual weights with Git LFS. KamgangAnthony has legacy pickle models. Neither of the first two repos supplies a clear redistribution license in the inspected root; we do not vendor their code, weights or datasets. Adapters are independent compatibility code. The third repository is MIT. No source accuracy claim is reported as PredictLM accuracy.

## Configure only if you want the specialized models

Create a Python virtual environment, then from this directory:

```sh
pip install -r requirements.txt
# Install only dependencies needed for the selected adapter:
pip install scikit-image scikit-learn  # HOG: versions must match your pickle artifacts
pip install torch torchvision         # PyTorch
pip install tensorflow                # Keras
```

Set `ANIMAL_MODEL_ROOT` to a directory containing the paths above, `ANIMAL_BACKENDS` to a comma-separated subset of the adapter IDs, and `ANIMAL_VISION_TOKEN` to a random private secret. For your own verified legacy pickle files only, set `ANIMAL_TRUST_LEGACY_PICKLE=1`; HTTP uploads are never deserialized as models. PyTorch uses `weights_only=True`, Keras uses `safe_mode=True`. Models load once at service startup. Start with `waitress-serve --listen=127.0.0.1:8765 app:app`; a hosted instance should sit behind HTTPS.

In the Next.js server environment set `ANIMAL_VISION_URL` and the same `ANIMAL_VISION_TOKEN`. Vercel needs a reachable HTTPS service, not the operator's localhost. There is no automatic upload from browser mode. `GET /api/vision/animals` advertises only successfully loaded adapters. `POST` accepts a file plus an allowlisted adapter; no caller-supplied image URLs, model paths, or credentials. Uploaded bytes are processed in memory and never persisted.
