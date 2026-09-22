import { fetchPage } from "@/lib/dynamicContent";
import CmsArticle from "@/components/CmsArticle";

const DEFAULT_TITLE = "Privacy Policy | Bangla Fashions";
const DEFAULT_DESCRIPTION = "How Bangla Fashions collects, uses and protects your personal information when you shop for clothing on our website and receive deliveries across Bangladesh.";

// Reads the admin-saved SEO title/description for this page (Pages editor)
// and falls back to the built-in defaults above when no override is set.
export async function generateMetadata() {
    const page = await fetchPage("privacy-policy");
    const title = page?.seoTitle || DEFAULT_TITLE;
    const description = page?.seoDescription || DEFAULT_DESCRIPTION;
    return {
        title,
        description,
        keywords: "privacy policy, Bangla Fashions privacy, data protection, personal information, online clothing store Bangladesh",
        openGraph: {
            title,
            description,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"}/privacy-policy`,
            siteName: "Bangla Fashions",
            type: "website"
        }
    };
}

export default async function PrivacyPolicyPage() {
    const page = await fetchPage("privacy-policy");
    if (page?.body) return <CmsArticle title={page.title} html={page.body} />;
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-emerald-600 text-white py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
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
                                Introduction
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                <span className="font-semibold">BANGLA FASHIONS</span> is a traditional clothing brand based in Sylhet, trading since 1 September 2007 and selling across Bangladesh, retail and wholesale. To take an order and get a parcel to your door, we need a small amount of information about you. This policy explains exactly what we collect, why we collect it, who else sees it, and what you can ask us to do with it. It covers this website, our customer accounts and the messages we send about your orders.
                            </p>
                        </div>

                        {/* Section 2 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                Information We Collect
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                We collect the following, and nothing beyond what an order actually needs:
                            </p>
                            <div className="ml-16 space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1. Contact & Delivery Details</h3>
                                    <p className="text-gray-700 leading-relaxed">Your name, mobile number, delivery address and email address, given when you register or check out. The courier needs the name, number and address to deliver the parcel.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2. Order History</h3>
                                    <p className="text-gray-700 leading-relaxed">What you ordered, in which size and colour, the amount, the payment method, delivery status and any return or exchange raised against the order.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2.3. Payment Information</h3>
                                    <p className="text-gray-700 leading-relaxed">Online payments are processed by SSLCommerz. Your card number, bKash or Nagad PIN and one-time codes are entered on their secure page, not ours. We receive only the transaction reference, amount and status. BANGLA FASHIONS never stores full card or wallet credentials.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2.4. Photos You Send Us</h3>
                                    <p className="text-gray-700 leading-relaxed">Images you upload with a product review, or send with a return or exchange request so we can see the fault. Uploaded images are stored with our image host, Cloudinary.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2.5. Cookies & Website Usage</h3>
                                    <p className="text-gray-700 leading-relaxed">Cookies keep you logged in and keep your cart from emptying between visits. If analytics is switched on, tools such as Google Analytics, Google Tag Manager or Meta Pixel record pages viewed and products clicked, so we know which sizes and categories to stock. This is aggregate browsing data, not your name.</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                How We Use Your Information
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                We use your personal information for the following purposes:
                            </p>
                            <div className="ml-16 space-y-3">
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">3.1. Order Fulfilment:</span> To confirm your order, pack it, book it with the courier and deliver it to your address.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">3.2. Order Updates:</span> To send confirmation, dispatch and delivery messages by email or SMS, and to call you if the address or size needs checking.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">3.3. Support, Returns & Exchanges:</span> To answer questions about fit or fabric and to process a size exchange, return or refund.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">3.4. Offers & Improvement:</span> To send campaign or new-arrival messages if you have opted in, and to work out which products and sizes to restock.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">3.5. Legal Compliance:</span> To keep sales records and meet our obligations under the applicable laws of Bangladesh.</p>
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                Sharing Your Information
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                We do not sell your data. We share it only with the partners that make an order work:
                            </p>
                            <div className="ml-16 space-y-3">
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">4.1. Courier Partners:</span> Steadfast and other delivery partners receive your name, mobile number, address and, for cash-on-delivery parcels, the amount to collect.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">4.2. Payment Gateway:</span> SSLCommerz processes online payments and handles the card and mobile wallet details directly.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">4.3. Technical Service Providers:</span> Cloudinary hosts our product and customer-uploaded images, our email provider sends order and account emails, and analytics providers report anonymous site usage.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">4.4. Legal & Business Transfers:</span> Where the law requires disclosure, or if the business is sold or merged, your data passes to the new owner under the same protections.</p>
                            </div>
                        </div>

                        {/* Section 5 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
                                Data Security & Retention
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                Traffic to this site runs over SSL, account passwords are stored hashed rather than in plain text, and admin access to customer records is limited to staff who need it.
                            </p>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                Order records stay in our system while your account is active, and afterwards for as long as we need them for accounts, warranty and legal purposes. Marketing contact details are removed once you unsubscribe. Photos sent with a return are deleted once the case is closed.
                            </p>
                        </div>

                        {/* Section 6 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</span>
                                Your Rights & Choices
                            </h2>
                            <div className="ml-16 space-y-3">
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">6.1. See & Correct:</span> Log in to view your orders and update your name, phone number or delivery address at any time.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">6.2. Deletion:</span> Ask us to close your account and delete your details. We keep only the sales records we are required to retain.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">6.3. Marketing Opt-Out:</span> Use the unsubscribe link in our emails or tell our support team to stop promotional SMS. Messages about an order you have placed will still be sent.</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">6.4. Cookie Control:</span> Block or clear cookies in your browser settings. Some features, such as staying logged in and keeping your cart, will stop working.</p>
                            </div>
                        </div>

                        {/* Section 7 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">7</span>
                                Children&apos;s Privacy
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                We sell kids&apos; clothing, but accounts and orders are for adults. We do not knowingly collect personal information from anyone under 13. If a child has given us their details, write to us and we will remove them.
                            </p>
                        </div>

                        {/* Section 8 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">8</span>
                                Changes to This Policy
                            </h2>
                            <p className="text-gray-700 leading-relaxed ml-11">
                                If we add a payment method, change courier partners or start using a new tool, we will update this page and change the effective date at the top.
                            </p>
                        </div>

                        {/* Section 9 */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">9</span>
                                Contact Us
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-4 ml-11">
                                For any question about your data, or to ask us to correct or delete it, use our Contact page or reach us at:
                            </p>
                            <div className="ml-16 bg-gray-50 rounded-lg p-6">
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">BANGLA FASHIONS</span></p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Email:</span> <a href="mailto:banglafashion2007@gmail.com" className="hover:underline">banglafashion2007@gmail.com</a></p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Phone:</span> <a href="tel:+8801911700793" className="hover:underline">+880 1911-700793</a>, <a href="tel:+8801601383683" className="hover:underline">+880 1601-383683</a>, <a href="tel:+8801643480565" className="hover:underline">+880 1643-480565</a></p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Main Branch:</span> Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Shibganj Branch:</span> Opposite of Pubali Bank, Shibganj, Sylhet</p>
                                <p className="text-gray-700 leading-relaxed"><span className="font-semibold">Tilagor Branch:</span> West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
