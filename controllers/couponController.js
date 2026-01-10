const Coupon = require("../models/Coupon");
const mongoose = require("mongoose");

// ✅ إنشاء كوبون جديد
exports.createCoupon = async (req, res) => {
    try {
        const { discount, validUntil } = req.body;

        if (!discount || !validUntil) {
            return res.status(400).json({ message: "❌ جميع الحقول مطلوبة" });
        }

        // ✅ توليد كود كوبون عشوائي (غير متسلسل)
        const code = Math.random().toString(36).substr(2, 8).toUpperCase();

        const newCoupon = new Coupon({
            code,
            discount,
            validUntil
        });

        await newCoupon.save();

        res.status(201).json({
            message: "✅ تم إنشاء الكوبون بنجاح",
            coupon: newCoupon
        });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في إنشاء الكوبون", error });
    }
};

// ✅ التحقق من صحة الكوبون
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: "❌ يجب إدخال كود الكوبون" });
        }

        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            return res.status(404).json({ message: "❌ الكوبون غير موجود" });
        }

        if (coupon.isUsed) {
            return res.status(400).json({ message: "❌ تم استخدام الكوبون من قبل" });
        }

        if (new Date() > new Date(coupon.validUntil)) {
            return res.status(400).json({ message: "❌ انتهت صلاحية الكوبون" });
        }

        res.status(200).json({
            message: "✅ الكوبون صالح للاستخدام",
            discount: coupon.discount
        });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في التحقق من الكوبون", error });
    }
};

// ✅ استخدام الكوبون
exports.useCoupon = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: "❌ يجب إدخال كود الكوبون" });
        }

        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            return res.status(404).json({ message: "❌ الكوبون غير موجود" });
        }

        if (coupon.isUsed) {
            return res.status(400).json({ message: "❌ تم استخدام الكوبون من قبل" });
        }

        if (new Date() > new Date(coupon.validUntil)) {
            return res.status(400).json({ message: "❌ انتهت صلاحية الكوبون" });
        }

        // ✅ تحديث الكوبون على أنه مستخدم
        coupon.isUsed = true;
        await coupon.save();

        res.status(200).json({ message: "✅ تم استخدام الكوبون بنجاح" });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في استخدام الكوبون", error });
    }
};

// ✅ جلب جميع الكوبونات
exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.status(200).json(coupons);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في جلب الكوبونات", error });
    }
};

// ✅ حذف كوبون
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ تحقق من صحة الـ ObjectId قبل الحذف
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "❌ معرف الكوبون غير صالح" });
        }

        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({ message: "❌ الكوبون غير موجود" });
        }

        res.status(200).json({ message: "✅ تم حذف الكوبون بنجاح" });

    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في حذف الكوبون", error });
    }
};
