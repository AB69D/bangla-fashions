import TopSelling from "@/components/TopSelling";

export const metadata = {
    title: "Top Selling Products | Bangla Fashions - Best Sellers",
    description: "Check out the best selling clothing at Bangla Fashions - the panjabi, polo shirts, t-shirts and pants our customers order most.",
    keywords: "top selling clothing, best sellers Bangla Fashions, popular panjabi, best polo shirt, t-shirt Bangladesh, men's and women's fashion",
    openGraph: {
        title: "Top Selling Products | Bangla Fashions",
        description: "Check out the best selling clothing at Bangla Fashions.",
        url: "https://example.com/top-selling",
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
        title: "Top Selling Products | Bangla Fashions",
        description: "Check out the best selling clothing at Bangla Fashions.",
        images: ["/logo.png"]
    }
};

export default function TopSellingPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <TopSelling />
                </div>
            </div>
        </div>
    );
}
