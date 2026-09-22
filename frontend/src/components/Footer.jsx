"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import {
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaYoutube,
    FaTiktok,
    FaTwitter,
    FaWhatsapp,
} from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import { fetchSiteSettings, fetchFooter } from "../lib/dynamicContent";
import { splitPhones, telHref } from "../lib/phone";
import { useWhatsApp } from "@/hooks/useWhatsApp";

// Map platform name (case-insensitive) → icon + brand color hover.
const PLATFORM_META = {
    facebook: { Icon: FaFacebookF, hoverBg: "hover:bg-[#1877F2]" },
    instagram: {
        Icon: FaInstagram,
        hoverBg:
            "hover:bg-gradient-to-tr hover:from-[#feda75] hover:via-[#fa7e1e] hover:to-[#d62976]",
    },
    linkedin: { Icon: FaLinkedinIn, hoverBg: "hover:bg-[#0A66C2]" },
    youtube: { Icon: FaYoutube, hoverBg: "hover:bg-[#FF0000]" },
    tiktok: { Icon: FaTiktok, hoverBg: "hover:bg-black" },
    twitter: { Icon: FaTwitter, hoverBg: "hover:bg-[#1DA1F2]" },
    x: { Icon: FaTwitter, hoverBg: "hover:bg-black" },
    whatsapp: { Icon: FaWhatsapp, hoverBg: "hover:bg-[#25D366]" },
    email: { Icon: HiOutlineMail, hoverBg: "hover:bg-[#EA4335]" },
};

const FALLBACK_SETTINGS = {
    siteName: "Bangla Fashions",
    description:
        "Everyday and traditional clothing for men, women and kids. Serving Sylhet since 2007.",
    // Blank on purpose: show the admin-configured logo when set, otherwise
    // render no logo at all rather than a leftover brand's placeholder image.
    logoUrl: "",
    contactEmail: "banglafashion2007@gmail.com",
    contactPhone: "+880 1911-700793, +880 1601-383683, +880 1643-480565",
    contactAddress:
        "Main Branch: Opposite of MM College Post Office, VIP Road, Lamabazar, Sylhet. Shibganj Branch: Opposite of Pubali Bank, Shibganj, Sylhet. Tilagor Branch: West to the Tilagor Jame Moszid, Tamabil Road, Tilagor, Sylhet.",
    socialLinks: [],
};

const FALLBACK_FOOTER = {
    columns: [
        {
            title: "Customer Support",
            links: [
                { label: "Corporate Deal", url: "/corporate-deal" },
                { label: "Contact", url: "/contact" },
                { label: "Refund and Returns", url: "/refund-returns" },
                { label: "FAQ", url: "/faq" },
                { label: "Blog", url: "/blog" },
            ],
        },
        {
            title: "Information",
            links: [
                { label: "About", url: "/about" },
                { label: "Terms & Conditions", url: "/terms-condition" },
                { label: "Privacy Policy", url: "/privacy-policy" },
            ],
        },
    ],
    copyrightText: "",
};

const merge = (fallback, dynamic) => {
    if (!dynamic) return fallback;
    const out = { ...fallback };
    for (const [k, v] of Object.entries(dynamic)) {
        if (v == null) continue;
        if (Array.isArray(v) && v.length === 0) continue;
        if (typeof v === "string" && v.trim() === "") continue;
        out[k] = v;
    }
    return out;
};

export default function Footer() {
    const pathname = usePathname();
    const wa = useWhatsApp();
    const [settings, setSettings] = useState(FALLBACK_SETTINGS);
    const [footer, setFooter] = useState(FALLBACK_FOOTER);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [s, f] = await Promise.all([fetchSiteSettings(), fetchFooter()]);
            if (cancelled) return;
            if (s) setSettings(merge(FALLBACK_SETTINGS, s));
            if (f) setFooter(merge(FALLBACK_FOOTER, f));
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const socialIcons = (settings.socialLinks || []).map((link) => {
        const meta = PLATFORM_META[(link.platform || "").toLowerCase()] || {
            Icon: HiOutlineMail,
            hoverBg: "hover:bg-emerald-700",
        };
        return { ...link, ...meta };
    });

    const phones = splitPhones(settings.contactPhone);

    const columns = (footer.columns?.length ? footer.columns : FALLBACK_FOOTER.columns).slice();
    columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // The POS terminal renders full-screen without storefront chrome.
    if (pathname?.startsWith("/pos")) return null;

    return (
        <footer className="relative mt-16 text-emerald-50 overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: "var(--theme-accent)" }} />

            <div
                className="relative"
                style={{ backgroundImage: "linear-gradient(to bottom, var(--theme-footer-from), var(--theme-footer-via), var(--theme-footer-to))" }}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.08] pointer-events-none"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 20%, var(--theme-accent) 0, transparent 35%), radial-gradient(circle at 80% 80%, var(--theme-primary) 0, transparent 35%)",
                    }}
                />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-10">
                        {/* Left — brand block */}
                        <div className="col-span-2 md:col-span-5">
                            {settings.logoUrl && (
                                <div className="mb-4 inline-flex items-center justify-center bg-white/95 rounded-full shadow-lg ring-4 ring-red-500 w-36 h-36 sm:w-40 sm:h-40">
                                    <Image
                                        src={settings.logoUrl}
                                        alt={`${settings.siteName} Logo`}
                                        width={220}
                                        height={70}
                                        className="object-contain w-28 sm:w-32 h-auto"
                                        unoptimized
                                    />
                                </div>
                            )}
                            <p className="text-emerald-100/90 leading-relaxed mb-6 max-w-md">
                                {settings.description || FALLBACK_SETTINGS.description}
                            </p>

                            <div className="space-y-3 mb-7 text-sm">
                                {settings.contactAddress && (
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center ring-1 ring-red-400/30">
                                            <FiMapPin className="w-4 h-4" />
                                        </span>
                                        <span className="text-emerald-50">
                                            {settings.contactAddress}
                                        </span>
                                    </div>
                                )}
                                {phones.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center ring-1 ring-red-400/30">
                                            <FiPhone className="w-4 h-4" />
                                        </span>
                                        <span className="flex flex-wrap gap-x-4 gap-y-1">
                                            {phones.map((phone) => (
                                                <a
                                                    key={phone}
                                                    href={telHref(phone)}
                                                    className="text-emerald-50 hover:text-red-300 transition-colors"
                                                >
                                                    {phone}
                                                </a>
                                            ))}
                                        </span>
                                    </div>
                                )}
                                {settings.contactEmail && (
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center ring-1 ring-red-400/30">
                                            <FiMail className="w-4 h-4" />
                                        </span>
                                        <a
                                            href={`mailto:${settings.contactEmail}`}
                                            className="text-emerald-50 hover:text-red-300 transition-colors"
                                        >
                                            {settings.contactEmail}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {socialIcons.length > 0 && (
                                <div className="flex flex-wrap gap-2.5">
                                    {socialIcons.map(({ platform, url, Icon, hoverBg }) => (
                                        <a
                                            key={platform + url}
                                            href={url}
                                            aria-label={platform}
                                            title={platform}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-emerald-50 ring-1 ring-white/15 ${hoverBg} hover:text-white hover:ring-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                                        >
                                            <Icon className="w-[18px] h-[18px]" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Middle/right — dynamic columns */}
                        {columns.slice(0, 2).map((col, idx) => (
                            <div key={col.title + idx} className={idx === 0 ? "col-span-1 md:col-span-3" : "col-span-1 md:col-span-4"}>
                                <h3 className="text-base font-bold text-white mb-4 relative inline-block">
                                    {col.title}
                                    <span className="absolute -bottom-1.5 left-0 w-10 h-0.5 bg-red-500 rounded-full" />
                                </h3>
                                <ul className="space-y-2.5 text-sm mb-7">
                                    {(col.links || [])
                                        .slice()
                                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                        .map((l, j) => (
                                            <li key={l.label + l.url + j}>
                                                {l.openInNewTab ? (
                                                    <a
                                                        href={l.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group inline-flex items-center text-emerald-100/90 hover:text-red-300 transition-colors"
                                                    >
                                                        <span className="inline-block w-0 group-hover:w-3 h-px bg-red-500 mr-0 group-hover:mr-2 transition-all duration-300" />
                                                        {l.label}
                                                    </a>
                                                ) : (
                                                    <Link
                                                        href={l.url}
                                                        className="group inline-flex items-center text-emerald-100/90 hover:text-red-300 transition-colors"
                                                    >
                                                        <span className="inline-block w-0 group-hover:w-3 h-px bg-red-500 mr-0 group-hover:mr-2 transition-all duration-300" />
                                                        {l.label}
                                                    </Link>
                                                )}
                                            </li>
                                        ))}
                                </ul>

                                {idx === 1 && (phones.length > 0 || wa.enabled) && (
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 ring-1 ring-white/10">
                                        <p className="text-xs font-semibold tracking-widest uppercase text-red-300 mb-1">
                                            Need help with an order?
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {phones.length > 0 && (
                                                <a
                                                    href={telHref(phones[0])}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                                                >
                                                    <FiPhone className="w-4 h-4" />
                                                    Call to Order
                                                </a>
                                            )}
                                            {wa.enabled && (
                                                <a
                                                    href={wa.chatUrl("Hi, I'd like to place an order.")}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                                                >
                                                    <FaWhatsapp className="w-4 h-4" />
                                                    Chat on WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-emerald-100/80">
                        <p>
                            {footer.copyrightText ||
                                `© ${new Date().getFullYear()} ${settings.siteName}. All rights reserved.`}
                        </p>
                        <p className="font-medium">
                            <span className="text-red-300">Developed by Md Manzurul Islam</span>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
