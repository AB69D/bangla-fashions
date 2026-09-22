import Link from "next/link";
import { FiFileText } from "react-icons/fi";

export const metadata = {
    title: "Blog | Bangla Fashions",
    description: "Notes on fabric, fit and what to wear for Eid from Bangla Fashions in Sylhet. Nothing published yet — reach us on the contact page in the meantime.",
};

export default function BlogPage() {
    return (
        <div className="py-12">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Blog</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                    <FiFileText className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Nothing published yet</h2>
                <p className="text-gray-600 leading-relaxed">
                    We have not written anything here so far. When we do it will be the things customers ask us at
                    the counter: which panjabi fabric survives a long Eid day, how to pick a size without trying it
                    on, how to wash cotton so it keeps its shape.
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                    Until then, ask us directly. Questions about a size, a fabric, an order or a wholesale rate get
                    a faster answer on the{' '}
                    <Link href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact page</Link>{' '}
                    or over the phone.
                </p>
            </div>
        </div>
    );
}
