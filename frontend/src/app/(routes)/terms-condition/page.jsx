import { fetchPage } from "@/lib/dynamicContent";
import CmsArticle from "@/components/CmsArticle";

const DEFAULT_TITLE = "Terms & Conditions | Bangla Fashions";
const DEFAULT_DESCRIPTION = "Read the Terms & Conditions for shopping with Bangla Fashions — orders, pricing in BDT, payment, delivery, sizing, returns and the legal terms that apply to your purchase.";

// Reads the admin-saved SEO title/description for this page (Pages editor)
// and falls back to the built-in defaults above when no override is set.
export async function generateMetadata() {
    const page = await fetchPage("terms-condition");
    const title = page?.seoTitle || DEFAULT_TITLE;
    const description = page?.seoDescription || DEFAULT_DESCRIPTION;
    return {
        title,
        description,
        keywords: "terms and conditions, Bangla Fashions terms, user agreement, clothing order terms, online shopping Bangladesh",
        openGraph: {
            title,
            description,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"}/terms-condition`,
            siteName: "Bangla Fashions",
            type: "website"
        }
    };
}

export default async function TermsConditionPage() {
    const page = await fetchPage("terms-condition");
    if (page?.body) return <CmsArticle title={page.title} html={page.body} />;
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-emerald-600 text-white py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms & Conditions</h1>
                    <p className="text-lg opacity-90">Effective Date: 22 September 2026</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <div className="prose prose-lg max-w-none">
                        {/* Section 1 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                General Information
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                This website is owned and operated by <span className="font-semibold">BANGLA FASHIONS</span>, a traditional clothing brand trading in Sylhet, Bangladesh since 1 September 2007, retail and wholesale both, from three showrooms. Our main branch is at: Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet. By browsing this website, creating an account or placing an order, you agree to these Terms & Conditions.
                            </p>
                        </div>

                        {/* Section 2 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                Eligibility
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                By using our services, you confirm that:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-16">
                                <li>You are at least 18 years of age, or are ordering with the consent of a parent or guardian.</li>
                                <li>You are legally capable of entering into binding agreements.</li>
                                <li>The name, phone number and delivery address you give us are accurate and reachable.</li>
                            </ul>
                        </div>

                        {/* Section 3 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                Sizing, Colour & Product Description
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                We publish a measurement chart for every garment. Please read it before ordering, as size labels differ from brand to brand. A few things worth knowing:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-16">
                                <li>Garment measurements may vary by up to half an inch, which is normal in stitched clothing.</li>
                                <li>Colours look different on different screens and under different lighting. Slight variation between the photo and the delivered item is not treated as a defect.</li>
                                <li>Natural fabrics may show minor texture or weave variation from piece to piece.</li>
                                <li>Stock, sizes and specifications can change without prior notice.</li>
                            </ul>
                        </div>

                        {/* Section 4 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                Pricing & Payment
                            </h2>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-3 ml-11">
                                <li>All prices are listed in Bangladeshi Taka (BDT) and apply to orders delivered inside Bangladesh.</li>
                                <li>Delivery charge is calculated at checkout and shown before you confirm the order.</li>
                                <li>You can pay by Cash on Delivery (COD), or online through our SSLCommerz gateway using bKash, Nagad, or a debit or credit card.</li>
                                <li>Prices and campaign offers may change at any time. The price that applies to your order is the price shown when the order is placed.</li>
                                <li>BANGLA FASHIONS may cancel an order and refund any amount paid if a product was listed at an obviously incorrect price.</li>
                            </ul>
                        </div>

                        {/* Section 5 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
                                Order Acceptance & Cancellation
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                An order is confirmed once our team verifies it by phone, SMS or email. We may cancel or refuse an order for reasons including:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-16">
                                <li>The size or colour you selected has gone out of stock.</li>
                                <li>The delivery address is incomplete or the phone number cannot be reached.</li>
                                <li>Suspected fraudulent, unauthorised or illegal activity.</li>
                                <li>A history of refusing cash-on-delivery parcels at the door.</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4 ml-11">
                                You may cancel an order yourself at any time before it is handed to the courier. After dispatch, please use the returns process instead.
                            </p>
                        </div>

                        {/* Section 6 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</span>
                                Shipping & Delivery
                            </h2>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-3 ml-11">
                                <li>Delivery time depends on the courier and on the address, so we confirm the expected date with you when we confirm the order.</li>
                                <li>You get a tracking number once the parcel is handed to the courier.</li>
                                <li>Eid season, hartal, floods and other disruptions slow the couriers down, and any date we give you is an estimate rather than a guarantee.</li>
                                <li>Once a parcel is handed over to our courier partner, delays caused by the courier or by conditions outside our control are not the liability of BANGLA FASHIONS. We will still help you trace the parcel.</li>
                            </ul>
                        </div>

                        {/* Section 7 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">7</span>
                                Returns, Exchanges & Refunds
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                In short, and in full on our Refund & Returns page:
                            </p>
                            {/* Owner to confirm the real return window and damaged-item reporting window before launch, then state them here and on the Refund & Returns page. */}
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-3 ml-16">
                                <li>If the fit is wrong, or the item is not the one you ordered, contact us with your order number and we will arrange an exchange or a return. Tell us as soon as the parcel arrives.</li>
                                <li>The item must be unworn, unwashed, free of stains and odour, and still carry its original tags and packaging.</li>
                                <li>Innerwear, customised or tailored pieces, and final clearance items cannot be returned.</li>
                                <li>If the parcel arrives damaged, defective or containing the wrong item, open it in front of the delivery person where you can, and send us photos with your message so we can arrange a replacement or refund.</li>
                            </ul>
                        </div>

                        {/* Section 8 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">8</span>
                                Account Security
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                You are responsible for keeping your account password and order history confidential. Tell us right away if you think someone else is using your account. BANGLA FASHIONS may suspend or close accounts that show suspicious or unauthorised behaviour.
                            </p>
                        </div>

                        {/* Section 9 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">9</span>
                                Prohibited Activities
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                You are strictly prohibited from:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-16">
                                <li>Using this website for any fraudulent or harmful purpose, including placing fake cash-on-delivery orders.</li>
                                <li>Attempting to hack, disrupt, or gain unauthorised access to our servers.</li>
                                <li>Scraping or copying website content (product photography, text or logos) for commercial use without our written consent.</li>
                            </ul>
                        </div>

                        {/* Section 10 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">10</span>
                                Intellectual Property
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                All website content, including the BANGLA FASHIONS name and logo, our product photography, prints, embroidery artwork, graphics and text, is the property of BANGLA FASHIONS. Reselling our designs or reusing our photographs without written permission is not allowed.
                            </p>
                        </div>

                        {/* Section 11 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">11</span>
                                Limitation of Liability
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                BANGLA FASHIONS shall not be held liable for:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-16">
                                <li>Indirect, incidental or consequential losses arising from the use of our website.</li>
                                <li>Delays caused by courier partners, payment gateways or network outages.</li>
                                <li>Damage to a garment caused by washing, drying or ironing against the instructions on its care label.</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4 ml-11">
                                Where we are liable, our responsibility is limited to the amount you paid for the item in question.
                            </p>
                        </div>

                        {/* Section 12 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">12</span>
                                Governing Law
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                These Terms & Conditions are governed by the laws of the People&apos;s Republic of Bangladesh. Any dispute that cannot be settled between us will be handled by the courts of Bangladesh.
                            </p>
                        </div>

                        {/* Section 13 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">13</span>
                                Contact Information
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                For any questions regarding these Terms, please reach us through our Contact page or at:
                            </p>
                            <div className="ml-16 bg-gray-50 rounded-lg p-6">
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Brand:</span> BANGLA FASHIONS</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Main Branch:</span> Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Shibganj Branch:</span> Opposite of Pubali Bank, Shibganj, Sylhet</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Tilagor Branch:</span> West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Phone:</span> <a href="tel:+8801911700793" className="hover:underline">+880 1911-700793</a>, <a href="tel:+8801601383683" className="hover:underline">+880 1601-383683</a>, <a href="tel:+8801643480565" className="hover:underline">+880 1643-480565</a></p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Email:</span> <a href="mailto:banglafashion2007@gmail.com" className="hover:underline">banglafashion2007@gmail.com</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
