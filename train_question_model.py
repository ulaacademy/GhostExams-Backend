import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import torch
import os

# ✅ 1. تحميل البيانات
data = {
    'text': [
        "اشرح مفهوم الطاقة الحركية.",
        "ما هو ناتج ضرب 5 × 4؟",
        "اذكر عاصمة فرنسا.",
        "ما هي قوانين نيوتن للحركة؟",
        "عرف عملية التمثيل الضوئي."
    ],
    'label': [0, 1, 0, 0, 0]  # 0 = سؤال نصي، 1 = سؤال حسابي
}

df = pd.DataFrame(data)

# ✅ 2. تقسيم البيانات
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'], df['label'], test_size=0.2, random_state=42
)

# ✅ 3. تحميل Tokenizer ونموذج BERT
model_name = "bert-base-multilingual-cased"
tokenizer = AutoTokenizer.from_pretrained(model_name)

# ✅ 4. تحويل النصوص إلى مدخلات BERT
train_encodings = tokenizer(list(train_texts), truncation=True, padding=True)
val_encodings = tokenizer(list(val_texts), truncation=True, padding=True)

# ✅ 5. تحويل البيانات لتنسيق Dataset
class QuestionDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = QuestionDataset(train_encodings, list(train_labels))
val_dataset = QuestionDataset(val_encodings, list(val_labels))

# ✅ 6. تحميل النموذج
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)

# ✅ 7. إعدادات التدريب
training_args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=3,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=10,
    save_strategy="epoch",     # ✅ حفظ النموذج بعد كل Epoch
    save_total_limit=1         # ✅ الاحتفاظ بأحدث نموذج فقط
)

# ✅ 8. بدء عملية التدريب
print("🚀 بدء عملية التدريب...")
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset
)

trainer.train()

# ✅ 9. إنشاء مجلد لحفظ النموذج إذا لم يكن موجودًا
output_dir = "C:/temp/trained_model"  # 🔐 مسار آمن لتجنب مشاكل الصلاحيات
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
    print(f"📁 تم إنشاء المجلد: {output_dir}")
else:
    print(f"📁 المجلد موجود بالفعل: {output_dir}")

# ✅ 10. حفظ النموذج والتوكنيزر مع تصحيح الأخطاء
try:
    print("💾 جاري حفظ النموذج...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # ✅ عرض الملفات المحفوظة للتحقق
    saved_files = os.listdir(output_dir)
    print("📋 الملفات المحفوظة:", saved_files)

    # ✅ التحقق من وجود أي من ملفات النموذج المدعومة
    if "pytorch_model.bin" in saved_files or "model.safetensors" in saved_files:
        print("✅ تم حفظ النموذج بنجاح في 'C:/temp/trained_model'.")
    else:
        raise FileNotFoundError("❌ لم يتم العثور على ملفات النموذج بعد الحفظ (pytorch_model.bin أو model.safetensors).")
except Exception as e:
    print(f"❌ خطأ أثناء محاولة حفظ النموذج: {e}")
