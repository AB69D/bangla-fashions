"use client";
import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiHelpCircle } from "react-icons/fi";

export default function FaqPage() {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "How do I pick the right size?",
            answer: "Every product page has a size chart with chest, length and shoulder measurements in inches. The easiest way is to measure a shirt or panjabi you already wear comfortably and match it to the chart. If you are between two sizes, take the larger one."
        },
        {
            question: "What fabric do you use?",
            answer: "The fabric is listed on each product page along with the rest of the product details. If it is not clear from the listing, call any of our branches or message us on the Contact page and we will tell you exactly what that piece is made of."
        },
        {
            question: "How should I wash and care for my clothes?",
            answer: "Wash in cold water with a mild detergent, turn the garment inside out, and skip the bleach. Dry in shade so the colour does not fade, and iron on medium heat. For panjabi with embroidery or hand work, hand wash or dry clean is safer."
        },
        {
            question: "How long will delivery take?",
            answer: "It depends on the courier and on where the parcel is going. We confirm the expected date with you when we confirm the order, and we send you a tracking number once the parcel leaves us.\n\nAround Eid and other peak seasons the couriers get busy, so allow a little extra time then."
        },
        {
            question: "What are the delivery charges?",
            answer: "The charge depends on the delivery area you pick at checkout. Choose your area in the delivery form and the amount for that area shows up on the shipping line of the order summary, so you see the full total before you confirm.\n\nIf a free delivery offer is running, your cart tells you how much more you need to add to qualify for it."
        },
        {
            question: "Do you offer cash on delivery?",
            answer: "Yes, cash on delivery is available. We confirm every order before it goes out, and if the courier needs anything from you before delivery we will tell you then."
        },
        {
            question: "Can I pay online?",
            answer: "Yes. Along with cash on delivery we accept mobile banking and card payments. The payment options available for your order are shown at checkout."
        },
        {
            question: "Can I exchange or return an item?",
            // Owner to confirm the real return window and the damaged-item reporting window before launch, then state them here.
            answer: "If the fit is wrong, or the item is not what you ordered, contact us with your order number and we will arrange an exchange or a return. Tell us as soon as the parcel arrives, and keep the item unworn, unwashed and with its tags on. Size exchange is the most common case. For a damaged, defective or wrong item, open the parcel in front of the delivery person where you can and send us photos as soon as it arrives. When the mistake is ours we pay the courier charge both ways."
        },
        {
            question: "How do I track my order?",
            answer: "We send you a confirmation with your order number once the order is placed, and a courier tracking number when the parcel leaves us. You can also message us on the Contact page with your order number and we will check it for you."
        },
        {
            question: "Do you take wholesale or bulk orders?",
            answer: "Yes. Retail and wholesale are both available from all three branches, and we supply shops, offices and events. Send us the item, the quantity and the sizes on the Contact page and we will come back with a per-piece rate. If you need a logo on the order, tell us and we will confirm what can be arranged."
        },
        {
            question: "Can I come to your shop instead of ordering online?",
            answer: "Yes. We have three showrooms in Sylhet, and we have been trading here since 1 September 2007.\n\nMain Branch: Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet\nShibganj Branch: Opposite of Pubali Bank, Shibganj, Sylhet\nTilagor Branch: West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet\n\nAll three sell retail and wholesale. Call us before coming if you want a particular size or colour kept aside."
        }
    ];

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
                        <FiHelpCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Answers to the questions we get most about sizing, fabric, delivery, payment and exchanges.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md"
                        >
                            <button
                                onClick={() => toggleFaq(index)}
                                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:bg-gray-50 transition-colors"
                            >
                                <h3 className="text-lg font-semibold text-gray-800 pr-4">
                                    {faq.question}
                                </h3>
                                <div className="flex-shrink-0">
                                    {openIndex === index ? (
                                        <FiChevronUp className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                        <FiChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </button>
                            <div
                                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                                    openIndex === index ? 'max-h-[44rem] pb-5' : 'max-h-0'
                                }`}
                            >
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-3">Still have questions?</h2>
                    <p className="text-gray-600 mb-6">
                        If you didn&apos;t find the answer you were looking for, get in touch with us.
                    </p>
                    <a
                        href="/contact"
                        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Contact Us
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}
