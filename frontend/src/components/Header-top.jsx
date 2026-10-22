"use client";
import { usePathname } from "next/navigation";
import { FaPhoneAlt } from "react-icons/fa";
import { PiWhatsappLogoBold } from "react-icons/pi";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { splitPhones, telHref } from "@/lib/phone";

export default function HeaderTop() {
    const pathname = usePathname();
    const wa = useWhatsApp();
    // The POS terminal is a self-contained full-screen app — no storefront chrome.
    if (pathname?.startsWith("/pos")) return null;

    // contactPhone can hold several numbers. The bar shows every one of them,
    // each its own call link, so a shopper can ring whichever line they like.
    const phones = splitPhones(wa.contactPhone).filter((p) => telHref(p));
    const showCall = phones.length > 0;
    const showWhatsApp = wa.enabled;

    // Nothing to show until the admin sets a contact phone and/or enables WhatsApp.
    if (!showCall && !showWhatsApp) return null;

    return (
        <div className="bg-black mb-2 sm:mb-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 py-2 sm:py-1.5">
                    <p className="text-white text-xs sm:text-sm font-medium text-center">
                        Order any of our products via WhatsApp or call us
                    </p>
                    <div className="flex items-center gap-4 sm:gap-6">
                        {showCall && (
                            <div className="flex items-center gap-1.5 text-white">
                                <FaPhoneAlt className="text-sm text-green-500 shrink-0" />
                                <p className="text-xs sm:text-sm font-medium">
                                    {phones.map((phone, i) => (
                                        <span key={phone}>
                                            {i > 0 && <span className="text-white/50"> / </span>}
                                            <a href={telHref(phone)} className="hover:text-green-400 transition-colors whitespace-nowrap">
                                                {phone}
                                            </a>
                                        </span>
                                    ))}
                                </p>
                            </div>
                        )}
                        {showWhatsApp && (
                            <a
                                href={wa.chatUrl("Hi, I'd like to order a product.")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-white hover:text-green-400 transition-colors"
                            >
                                <PiWhatsappLogoBold className="text-sm text-green-500" />
                                <p className="text-xs sm:text-sm font-medium">WhatsApp</p>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};