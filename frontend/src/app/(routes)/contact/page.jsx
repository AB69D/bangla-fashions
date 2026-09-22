import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { ContactForm } from "./ContactForm";

export const metadata = {
    title: "Contact Bangla Fashions | Three Showrooms in Sylhet",
    description: "Call, email or visit Bangla Fashions in Sylhet. Three showrooms at Lamabazar, Shibganj and Tilagor, retail and wholesale, trading since 2007.",
    keywords: "contact Bangla Fashions, Bangla Fashions phone number, Bangla Fashions email, clothing store Sylhet contact, Lamabazar, Shibganj, Tilagor",
    openGraph: {
        title: "Contact Bangla Fashions",
        description: "Call, email or visit Bangla Fashions in Sylhet. Three showrooms, retail and wholesale, trading since 2007.",
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"}/contact`,
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
        title: "Contact Bangla Fashions",
        description: "Contact Bangla Fashions for any queries about our clothing.",
        images: ["/logo.png"]
    }
};

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-emerald-600 text-white py-12 sm:py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
                    <p className="text-lg sm:text-xl opacity-90">We&apos;d love to hear from you</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
                    {/* Contact Information */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                        <p className="text-gray-600 mb-8">
                            Questions about a size, an item you saw on the site, or an order you already placed? Call any of the numbers below, send us a message, or come into one of the three branches in Sylhet.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FiMapPin className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Showrooms</h3>
                                    <p className="text-gray-600">
                                        <span className="font-medium text-gray-800">Main Branch</span>
                                        <br />
                                        Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet
                                    </p>
                                    <p className="text-gray-600 mt-3">
                                        <span className="font-medium text-gray-800">Shibganj Branch</span>
                                        <br />
                                        Opposite of Pubali Bank, Shibganj, Sylhet
                                    </p>
                                    <p className="text-gray-600 mt-3">
                                        <span className="font-medium text-gray-800">Tilagor Branch</span>
                                        <br />
                                        West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FiPhone className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Phone</h3>
                                    <p className="text-gray-600">
                                        <a
                                            href="tel:+8801911700793"
                                            className="hover:text-emerald-600 transition-colors"
                                        >
                                            +880 1911-700793
                                        </a>
                                        <br />
                                        <span className="text-sm">General line</span>
                                    </p>
                                    <p className="text-gray-600 mt-3">
                                        <a
                                            href="tel:+8801601383683"
                                            className="hover:text-emerald-600 transition-colors"
                                        >
                                            +880 1601-383683
                                        </a>
                                        <br />
                                        <span className="text-sm">Hridoy Singh, Manager-in-Charge</span>
                                    </p>
                                    <p className="text-gray-600 mt-3">
                                        <a
                                            href="tel:+8801643480565"
                                            className="hover:text-emerald-600 transition-colors"
                                        >
                                            +880 1643-480565
                                        </a>
                                        <br />
                                        <span className="text-sm">Md. Toha Uddin Piash, Business Developer</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FiMail className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                                    <p className="text-gray-600">
                                        <a
                                            href="mailto:banglafashion2007@gmail.com"
                                            className="hover:text-emerald-600 transition-colors"
                                        >
                                            banglafashion2007@gmail.com
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <ContactForm />
                </div>
            </div>
        </div>
    );
}
