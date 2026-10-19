"""
ml/prepare_dataset.py
---------------------
Downloads, verifies, and organizes the SurgWound surgical wound image dataset
(OSWUMC - The Ohio State University Wexner Medical Center, npj Digital Medicine 2026, CC-BY-SA-4.0).

Organizes 686 clinical surgical wound images into patient-independent splits:
  - train (480 images)
  - val (69 images)
  - test (137 images)

Maps clinical surgical wound assessments directly into PostCare AI target classes:
  - 'good': 'Home Care (Green): Manage with routine care' (normal healing, intact margins, low complication risk)
  - 'moderate': 'Clinic Visit (Yellow): Requires professional evaluation within 48 hours' (erythema/edema/exudate, monitoring needed)
  - 'poor': 'Emergency Care (Red): Seek immediate medical attention' (severe dehiscence/infection/breakdown)

Outputs:
  - ml/dataset/surgwound/images/{image_name}
  - ml/dataset/surgwound/dataset_manifest.csv
"""

import os
import sys
import io
import json
import base64
import urllib.request
from pathlib import Path
import pandas as pd
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / 'dataset' / 'surgwound'
IMAGES_DIR = DATASET_DIR / 'images'
MANIFEST_PATH = DATASET_DIR / 'dataset_manifest.csv'

HF_BASE_URL = "https://huggingface.co/datasets/xuxuxuxuxu/SurgWound/resolve/main"

SPLIT_FILES = {
    'val': 'val_question.json',
    'test': 'test_question.json',
    'train': 'train_question.json',
}

LABEL_MAP = {
    'Home Care (Green): Manage with routine care': 'good',
    'Clinic Visit (Yellow): Requires professional evaluation within 48 hours': 'moderate',
    'Emergency Care (Red): Seek immediate medical attention': 'poor',
}


def download_and_process_split(split_name: str, filename: str):
    url = f"{HF_BASE_URL}/{filename}"
    print(f"\n[{split_name.upper()}] Downloading {filename} from {url}...")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'PostCareAI-DatasetPrep/1.0'})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
    
    print(f"[{split_name.upper()}] Downloaded {len(content) / (1024*1024):.2f} MB. Parsing JSON...")
    items = json.loads(content)
    print(f"[{split_name.upper()}] Loaded {len(items)} items.")

    records = {}

    for item in items:
        img_name = item.get('image_name')
        if not img_name:
            continue

        if img_name not in records:
            records[img_name] = {
                'image_name': img_name,
                'split': split_name,
                'urgency_level': None,
                'clinical_label': None,
                'infection_risk': None,
                'healing_status': None,
                'image_saved': False,
                'image_width': 0,
                'image_height': 0,
            }

            # Save image if base64 present
            img_b64 = item.get('image')
            if img_b64:
                try:
                    img_bytes = base64.b64decode(img_b64)
                    target_img_path = IMAGES_DIR / img_name
                    if not target_img_path.exists():
                        with Image.open(io.BytesIO(img_bytes)) as pil_img:
                            pil_img.convert('RGB').save(target_img_path, format='JPEG', quality=95)
                            records[img_name]['image_width'] = pil_img.width
                            records[img_name]['image_height'] = pil_img.height
                    else:
                        with Image.open(target_img_path) as pil_img:
                            records[img_name]['image_width'] = pil_img.width
                            records[img_name]['image_height'] = pil_img.height
                    records[img_name]['image_saved'] = True
                except Exception as exc:
                    print(f"Warning: Failed saving image {img_name}: {exc}")

        field = item.get('field')
        answer = item.get('answer')
        if field == 'Urgency Level':
            records[img_name]['urgency_level'] = answer
            records[img_name]['clinical_label'] = LABEL_MAP.get(answer, 'moderate')
        elif field == 'Infection Risk Assessment':
            records[img_name]['infection_risk'] = answer
        elif field == 'Healing Status':
            records[img_name]['healing_status'] = answer

    print(f"[{split_name.upper()}] Processed {len(records)} unique images.")
    return list(records.values())


def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    all_records = []

    for split in ['val', 'test', 'train']:
        split_records = download_and_process_split(split, SPLIT_FILES[split])
        all_records.extend(split_records)

    df = pd.DataFrame(all_records)
    df.to_csv(MANIFEST_PATH, index=False)
    print(f"\nSaved manifest to {MANIFEST_PATH}")
    print("\n=== DATASET SUMMARY ===")
    print(f"Total images: {len(df)}")
    print("\nDistribution by split:")
    print(df['split'].value_counts())
    print("\nClinical label distribution by split:")
    print(pd.crosstab(df['split'], df['clinical_label'], margins=True))
    print("\nMissing values check:")
    print(df.isnull().sum())


if __name__ == '__main__':
    main()
