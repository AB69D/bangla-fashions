import Link from "next/link";
import { fetchPage } from "@/lib/dynamicContent";
import { absoluteUrl } from "@/lib/seo.js";
import CmsArticle from "@/components/CmsArticle";

const DEFAULT_TITLE = "About Bangla Fashions | Traditional Clothing in Sylhet Since 2007";
const DEFAULT_DESCRIPTION = "A Fashion House of Deshi Brand. Bangla Fashions has been selling traditional and everyday clothing in Sylhet since 1 September 2007: panjabi, fotua, saree, three-piece, shirts, pants and kids' wear, retail and wholesale from three branches.";

// Reads the admin-saved SEO title/description for this page (Pages editor)
// and falls back to the built-in defaults above when no override is set.
export async function generateMetadata() {
    const page = await fetchPage("about");
    const title = page?.seoTitle || DEFAULT_TITLE;
    const description = page?.seoDescription || DEFAULT_DESCRIPTION;
    return {
        title,
        description,
        keywords: "about Bangla Fashions, A Fashion House of Deshi Brand, clothing shop Sylhet, traditional clothing Bangladesh, wholesale clothing Sylhet, panjabi, fotua, saree, three-piece, kurti, kids wear, since 2007",
        openGraph: {
            title,
            description,
            url: absoluteUrl("/about"),
            siteName: "Bangla Fashions",
            images: [
                {
                    url: "/logo.png",
                    width: 800,
                    height: 600,
                    alt: "Bangla Fashions Logo"
                }
            ],
            type: "website"
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ["/logo.png"]
        }
    };
}

export default async function AboutPage() {
    const page = await fetchPage("about");
    if (page?.body) return <CmsArticle title={page.title} html={page.body} />;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-emerald-600 text-white py-12 sm:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">About Bangla Fashions</h1>
                    <p className="text-lg sm:text-xl md:text-2xl font-light">
                        A Fashion House of Deshi Brand
                    </p>
                    <p className="text-base sm:text-lg font-light mt-3 opacity-90">
                        Traditional clothing from Sylhet, trading since 2007
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
                {/* Introduction */}
                <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 md:p-12 mb-12">
                    <p className="text-lg text-gray-700 leading-relaxed">
                        <span className="font-semibold text-emerald-600">Bangla Fashions</span> is a traditional clothing brand based in Sylhet, retail and wholesale. We opened on 1 September 2007 and have been trading ever since, which makes it nineteen years this September.
                    </p>
                    <p className="text-lg text-gray-700 leading-relaxed mt-6">
                        The range runs top to bottom. Panjabi, fotua, saree, three-piece and kurti on the traditional side. T-shirts, polo shirts, formal and casual shirts, pants, chinos and jeans for everyday. Kids&apos; wear for the rest of the family. We sell retail, at the counter and on this site, and we sell wholesale to shops and buyers ordering in quantity.
                    </p>
                </div>

                {/* Our Story */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-1 bg-emerald-600"></div>
                        <h2 className="text-3xl font-bold text-gray-900">Our Story</h2>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                        <p className="text-lg text-gray-700 leading-relaxed">
                            The shop opened on 1 September 2007. Nineteen years is long enough for a city to work out whether a business is straight with its customers, and that is what we have traded on. Quote the price, state the size, hand over what was agreed.
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed mt-6">
                            Sylhet is not a backdrop for us, it is where the brand comes from, and it shows in what sits on the rails. Panjabi and fotua for Eid and jumma, saree and three-piece for weddings and dawat, next to the shirts and pants the same customers wear to work on Sunday morning.
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed mt-6">
                            Fakrul Alam Chowdhury Zahid founded the business and leads it today as Founder &amp; CEO.
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed mt-6">
                            There are three branches, all in Sylhet, and all three are showrooms you can walk into. The Main Branch is opposite MM College Post Office on VIP Road, Lamabazar. The Shibganj Branch is opposite Pubali Bank in Shibganj. The Tilagor Branch is west to the Tilagor Jame Moszid on Tamabil Road. Retail or wholesale, it is the same people behind the counter.
                        </p>
                    </div>
                </div>

                {/* Why Choose Us */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-1 bg-emerald-600"></div>
                        <h2 className="text-3xl font-bold text-gray-900">Why Choose Bangla Fashions?</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Nineteen Years in Sylhet</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Open since 1 September 2007, in the same city, under the same name, now across three branches. A customer who bought from us years ago knows exactly where to find us again.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Top to Bottom</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Traditional wear and everyday wear under one roof, plus kids&apos; wear. Most families can finish a whole Eid list in a single visit instead of walking half of Lamabazar.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Retail and Wholesale</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Buy one panjabi, or order for your own shop. Tell us the item and the quantity on the{' '}
                                <Link href="/corporate-deal" className="text-emerald-600 font-semibold hover:underline">wholesale page</Link>{' '}
                                and we come back with a per-piece rate in taka.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Value for Money</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Every product page carries a clear price in taka. When an item is on offer you see the old price and the new one together, so the discount is a number you can check rather than a claim. Delivery charge shows at checkout before you confirm.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Our Values */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-1 bg-emerald-600"></div>
                        <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
                                    1
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Honesty</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Shototar sathe. It is how the shop started in 2007 and it is still the rule. The price we quote is the price you pay, and when we do not have your size we say so instead of talking you into the next one up.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
                                    2
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Sylhet&apos;s Own</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        We carry the heritage of this city in what we stock and how we deal. Our name is known here, and a name takes years to build and one bad sale to spend.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
                                    3
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Try It On</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Size is hard to judge on a screen, so nobody has to guess. Walk into any of the three branches and try the piece before you pay, or call us first and ask. The numbers are on the{' '}
                                        <Link href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact page</Link>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="bg-emerald-600 text-white rounded-2xl p-8 md:p-12 text-center">
                    <h2 className="text-3xl font-bold mb-4">Find Your Fit</h2>
                    <p className="text-xl mb-8 opacity-90">
                        Browse the range here, or come into any of the three branches in Sylhet and try it on.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Shop Now
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
