import Link from "next/link";
import { fetchPage } from "@/lib/dynamicContent";
import CmsArticle from "@/components/CmsArticle";

const DEFAULT_TITLE = "Wholesale & Corporate Orders | Bangla Fashions";
const DEFAULT_DESCRIPTION = "Wholesale and bulk clothing from Bangla Fashions, Sylhet: traditional and everyday wear supplied to shops, offices, schools and events since 2007, from three branches. Ask for a per-piece rate in BDT.";

// Reads the admin-saved SEO title/description for this page (Pages editor)
// and falls back to the defaults above when no override is set.
export async function generateMetadata() {
    const page = await fetchPage("corporate-deal");
    return {
        title: page?.seoTitle || DEFAULT_TITLE,
        description: page?.seoDescription || DEFAULT_DESCRIPTION,
    };
}

export default async function CorporateDealPage() {
    const page = await fetchPage("corporate-deal");
    if (page?.body) return <CmsArticle title={page.title} html={page.body} />;
    return (
        <div className="py-8 px-4 max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 text-center">Wholesale & Corporate Orders</h1>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8">
                Bangla Fashions has sold wholesale alongside the retail counter since 2007. Shops buying to resell,
                offices kitting out staff, schools, clubs and event organisers. Same garments we sell on the site,
                in the quantity you need.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Shops & Resellers */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Shops & Resellers</h2>
                        <p className="text-sm font-semibold text-emerald-600 mb-3">Buying to sell on</p>
                        <p className="text-gray-600 leading-relaxed">
                            Take from the same range we stock in Sylhet: panjabi, fotua, saree, three-piece, kurti,
                            shirts, pants and kids&apos; wear. Send the items and quantities you want and we quote per
                            piece in BDT.
                        </p>
                    </div>
                </div>

                {/* Staff & Uniform Orders */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Staff & Uniform Orders</h2>
                        <p className="text-sm font-semibold text-emerald-600 mb-3">Polos, shirts, fotua, staff tees</p>
                        <p className="text-gray-600 leading-relaxed">
                            Front desk, floor staff, delivery team, factory line. One colour across a full size run.
                            Give us the size breakdown and we will tell you what we can supply and by when.
                        </p>
                    </div>
                </div>

                {/* Event & Team Wear */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Event & Team Wear</h2>
                        <p className="text-sm font-semibold text-emerald-600 mb-3">Sports days, campaigns, conferences</p>
                        <p className="text-gray-600 leading-relaxed">
                            Tees and shirts for a one-off event, in a single colour or split across a few. Tell us the
                            event date when you write, because the date decides what is possible.
                        </p>
                    </div>
                </div>

                {/* Gifting & Corporate Packs */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Gifting & Corporate Packs</h2>
                        <p className="text-sm font-semibold text-emerald-600 mb-3">Eid, new year, client gifts</p>
                        <p className="text-gray-600 leading-relaxed">
                            Panjabi, fotua or shirt sets for employee and client gifting, packed ready to hand out.
                            Deliver to one address, or split the order across your branches if you send us the list.
                        </p>
                    </div>
                </div>
            </div>

            {/* How Wholesale Orders Work */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 mb-12">
                <h2 className="text-xl font-bold text-gray-800 mb-4">How wholesale orders work</h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                    We do not publish one minimum quantity or one rate card, because they change with the item. A
                    panjabi order and a t-shirt order are not the same job. So we quote it properly instead of
                    guessing on a web page.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3">Send us</h3>
                        <ul className="space-y-2 text-gray-600 text-sm leading-relaxed">
                            <li>The item you want, with a photo or the link from this site</li>
                            <li>Total quantity</li>
                            <li>Your size breakdown</li>
                            <li>The date you need it in hand</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3">We come back with</h3>
                        <ul className="space-y-2 text-gray-600 text-sm leading-relaxed">
                            <li>The minimum order for that item</li>
                            <li>A per-piece rate in BDT</li>
                            <li>A delivery date we can hold to</li>
                            <li>Payment terms, agreed before anything is confirmed</li>
                        </ul>
                    </div>
                </div>
                <p className="text-gray-600 leading-relaxed mt-6">
                    If you want a logo printed or embroidered on the order, say so when you ask for the quote. That is
                    not something we promise sight unseen: we come back and confirm what can be arranged for your item,
                    what it adds to the rate, and what it does to the delivery date.
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                    Delivery to your address, or collect from any of the three branches in Sylhet.
                </p>
            </div>

            {/* Contact Information */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 mb-12">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Talk to the Wholesale Desk</h2>
                <div className="space-y-2 text-gray-700">
                    <p>
                        <strong>Md. Toha Uddin Piash, Business Developer:</strong>{' '}
                        <a href="tel:+8801643480565" className="text-emerald-600 font-semibold hover:underline">+880 1643-480565</a>
                        {' '}— he handles wholesale enquiries, so start here.
                    </p>
                    <p>
                        <strong>Hridoy Singh, Manager-in-Charge:</strong>{' '}
                        <a href="tel:+8801601383683" className="text-emerald-600 font-semibold hover:underline">+880 1601-383683</a>
                    </p>
                    <p>
                        <strong>General line:</strong>{' '}
                        <a href="tel:+8801911700793" className="text-emerald-600 font-semibold hover:underline">+880 1911-700793</a>
                    </p>
                    <p>
                        <strong>Email:</strong>{' '}
                        <a href="mailto:banglafashion2007@gmail.com" className="text-emerald-600 font-semibold hover:underline">banglafashion2007@gmail.com</a>
                    </p>
                    <p><strong>Main Branch:</strong> Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet</p>
                    <p><strong>Shibganj Branch:</strong> Opposite of Pubali Bank, Shibganj, Sylhet</p>
                    <p><strong>Tilagor Branch:</strong> West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet</p>
                </div>
                <p className="text-gray-700 mt-4">
                    You can also send your requirement through the form on our{' '}
                    <Link href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact page</Link> and
                    we will get back to you with a quote.
                </p>
            </div>
        </div>
    );
}
