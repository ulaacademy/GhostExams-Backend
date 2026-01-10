# ✅ run_model.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import sys
import json
import os
import io

# ✅ ضبط الترميز الافتراضي على UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

try:
    # ✅ التحقق من وجود مسار النموذج
    model_path = "C:/temp/trained_model"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"❌ لم يتم العثور على مجلد النموذج في المسار: {model_path}")

    # ✅ تحميل النموذج والتوكنيزر
    print("🚀 جاري تحميل النموذج...", file=sys.stderr)
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    print("✅ تم تحميل النموذج بنجاح!", file=sys.stderr)

    # ✅ قراءة النص من الوسائط (arguments) بدلاً من stdin
    if len(sys.argv) < 2:
        raise ValueError("❌ لم يتم تلقي أي بيانات. تأكد من إرسال النص بشكل صحيح.")

    input_data = sys.argv[1]
    print("📥 تم استلام البيانات:", input_data, file=sys.stderr)

    # ✅ التحقق من صحة تنسيق JSON
    try:
        data = json.loads(input_data)
        print("✅ تم تحليل بيانات JSON بنجاح!", file=sys.stderr)
    except json.JSONDecodeError as e:
        raise ValueError(f"❌ فشل في تحليل بيانات JSON: {str(e)}")

    # ✅ التحقق من وجود النص وصحته
    if not isinstance(data, dict) or "text" not in data:
        raise ValueError("❌ تنسيق البيانات غير صحيح. يجب أن يحتوي JSON على المفتاح 'text'.")

    text = data.get("text", "").strip()
    if not text:
        raise ValueError("❌ يرجى إدخال نص صالح للتحليل.")

    # ✅ تحليل النص باستخدام النموذج
    print("🤖 جاري تحليل النص...", file=sys.stderr)
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    print("✅ تم تجهيز البيانات للنموذج!", file=sys.stderr)

    with torch.no_grad():
        outputs = model(**inputs)
        print("✅ تم تشغيل النموذج بنجاح!", file=sys.stderr)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    print("✅ التحليل اكتمل، جاري إرسال النتيجة...", file=sys.stderr)

    # ✅ إخراج النتيجة مع دعم الحروف العربية
    result = {
        "text": text,
        "prediction": prediction
    }
    print(json.dumps(result, ensure_ascii=False))

    print("✅ تم التحليل بنجاح!", file=sys.stderr)

except ValueError as ve:
    error_message = {"error": str(ve)}
    print(json.dumps(error_message, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)

except FileNotFoundError as fe:
    error_message = {"error": str(fe)}
    print(json.dumps(error_message, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)

except Exception as e:
    error_message = {"error": f"❌ خطأ غير متوقع: {str(e)}"}
    print(json.dumps(error_message, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
