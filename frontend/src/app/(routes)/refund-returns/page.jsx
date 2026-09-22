import { fetchPage } from "@/lib/dynamicContent";
import CmsArticle from "@/components/CmsArticle";

const DEFAULT_TITLE = "Refund & Returns Policy | Bangla Fashions";
const DEFAULT_DESCRIPTION = "Bangla Fashions return and exchange policy: how to ask for a size exchange or a return, the condition an item has to come back in, what cannot be returned, and how refunds are sent.";

// Reads the admin-saved SEO title/description for this page (Pages editor)
// and falls back to the defaults above when no override is set.
export async function generateMetadata() {
    const page = await fetchPage("refund-returns");
    return {
        title: page?.seoTitle || DEFAULT_TITLE,
        description: page?.seoDescription || DEFAULT_DESCRIPTION,
    };
}

export default async function RefundReturnsPage() {
    const page = await fetchPage("refund-returns");
    if (page?.body) return <CmsArticle title={page.title} html={page.body} />;
    return (
        <div className="py-8 px-4 max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Refund & Returns Policy</h1>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-8">
                {/* Introduction */}
                <div>
                    <p className="text-gray-600 leading-relaxed">
                        Buying clothes online means judging fit from a photo and a measurement chart. Sometimes the 
                        size is wrong. That is normal, and we would rather exchange it than argue about it.
                    </p>
                    {/* Owner to confirm the real return window before launch, then state it here. */}
                    <p className="text-gray-600 leading-relaxed mt-4">
                        If the fit is wrong, or the item is not the one you ordered, contact us with your order number 
                        and we will arrange an exchange or a return. Tell us <strong>as soon as the parcel arrives</strong>, 
                        and send the item back unworn, unwashed and with its tags still attached. If it arrives damaged, 
                        defective or simply not what you ordered, send photos with your message.
                    </p>
                </div>

                {/* Returns & Exchanges */}
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Returns & Exchanges</h2>
                    {/* Owner to confirm the real damaged-item reporting window before launch, then state it here. */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <p className="text-gray-700">
                            Please open the parcel in front of the delivery person and check the item, size and colour. 
                            If it is damaged or not what you ordered, refuse the parcel there and then. If you notice 
                            afterwards, tell us as soon as you can through our{' '}
                            <a href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact page</a> and send photos.
                        </p>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Accepted Reasons</h3>
                    <ul className="space-y-2">
                        {[
                            'The size does not fit and you want a different size of the same item',
                            'The item arrived damaged, stained or with a stitching or print defect',
                            'You received the wrong item, size or colour',
                            'The garment does not match the fabric or measurements listed on the product page',
                            'The parcel arrived after an unreasonable delay and you no longer need it'
                        ].map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                                    •
                                </span>
                                <span className="text-gray-600">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Size Exchange */}
                <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Size Exchange</h2>
                    <p className="text-gray-600 leading-relaxed mb-4">
                        Tell us your order number and the size you need instead. If that size is in stock we hold it 
                        for you while the first piece travels back to us, then dispatch the replacement as soon as it 
                        arrives and passes a quick check. If the size you want has sold out, we will offer another 
                        colour, a store credit, or a refund.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                        One exchange per order. After that, please treat it as a return.
                    </p>
                </div>

                {/* What We Cannot Take Back */}
                <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">What We Cannot Take Back</h2>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-gray-700">
                            For hygiene and fairness to other customers, some items are final. Please check the size 
                            chart carefully before ordering these.
                        </p>
                    </div>
                    <ul className="space-y-2">
                        {[
                            'Innerwear, socks and any item sold as an intimate or hygiene product',
                            'Customised, tailored or altered pieces, including personalised printing and embroidery',
                            'Items bought on final clearance, marked non-returnable on the product page',
                            'Anything worn, washed, ironed, perfumed or returned without its original tags and packaging',
                            // Owner to confirm the real return window before launch, then name it in this line.
                            'Requests raised after the return window has closed'
                        ].map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                                    •
                                </span>
                                <span className="text-gray-600">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* How to Request */}
                <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">How to Request a Return</h2>
                    <ul className="space-y-3">
                        {[
                            // Owner to confirm the real return and damaged-item windows before launch, then name them in this line.
                            'Contact us with your order number and what is wrong, as soon as the parcel arrives',
                            'Send two or three clear photos of the item, including the tag and any defect',
                            'We confirm the request and tell you where to send the parcel, or book a courier pickup',
                            'Pack the item with its tags and original packaging and hand it to the courier',
                            'Once it reaches us and passes inspection, we ship the exchange or start the refund'
                        ].map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </span>
                                <span className="text-gray-600 pt-0.5">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* How Refunds Are Sent */}
                <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">How Refunds Are Sent</h2>
                    <ul className="space-y-3">
                        {[
                            'Cash on delivery: once the returned item reaches us and passes inspection, the refund goes to your bKash, Nagad or bank account',
                            'Online payment: the refund goes back to the account or card you paid from',
                            'Cancelled before dispatch: refunded in full, with nothing deducted',
                            'Either way, we message you to confirm once the refund has been sent'
                        ].map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </span>
                                <span className="text-gray-600 pt-0.5">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Return Shipping */}
                <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Who Pays the Return Charge</h2>
                    <p className="text-gray-600 leading-relaxed">
                        If the fault is ours, meaning a defect, the wrong item or the wrong size in the parcel, we pay 
                        the courier charge both ways. If you are exchanging because the size you chose does not suit 
                        you, the charge for sending the item back is yours and we cover sending the replacement out. 
                        The original delivery charge is not refunded on change-of-mind returns.
                    </p>
                </div>

                {/* Closing Statement */}
                <div className="border-t border-gray-200 pt-8">
                    <p className="text-gray-600 leading-relaxed italic">
                        A clear return policy is what makes it safe to buy clothes you have not tried on. If your 
                        situation does not fit neatly into the rules above, write to us anyway and we will look at it 
                        properly.
                    </p>
                </div>
            </div>
        </div>
    );
}
