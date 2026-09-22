import Showcase from "@/components/Showcase.jsx";
import ShopByCategory from "@/components/ShopByCategory.jsx";
import NewArrivals from "@/components/New-Arraivals.jsx";
import TrustBadges from "@/components/TrustBadges.jsx";
import TopSelling from "@/components/TopSelling.jsx";
import AllProducts from "@/components/AllProducts.jsx";
import CustomerReviews from "@/components/CustomerReviews.jsx";
import Reveal from "@/components/Reveal.jsx";

export const metadata = {
    title: "Bangla Fashions - A Fashion House of Deshi Brand, Sylhet Since 2007",
    description: "Traditional and everyday clothing from Bangla Fashions, trading in Sylhet since 2007. Panjabi, fotua, saree and kurti alongside t-shirts, polo shirts, shirts, pants, jeans and kids' wear. Retail and wholesale.",
    keywords: "Bangla Fashions, clothing store Sylhet, wholesale clothing Sylhet, clothing store Bangladesh, t-shirt, polo shirt, fotua, panjabi, formal shirt, casual shirt, chinos, jeans, kurti, three piece, saree, kids clothing, men's fashion, women's fashion, online fashion shopping Bangladesh",
    openGraph: {
        title: "Bangla Fashions - A Fashion House of Deshi Brand, Sylhet Since 2007",
        description: "Men's, women's and kids' clothing from Bangla Fashions in Sylhet. Panjabi, fotua, saree, kurti and three-piece sets alongside t-shirts, shirts, pants and jeans. Retail and wholesale, run on honesty since 2007.",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",
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
        title: "Bangla Fashions - A Fashion House of Deshi Brand, Sylhet Since 2007",
        description: "Traditional and everyday wear for men, women and kids. Retail and wholesale from Bangla Fashions, Sylhet, trading since 2007.",
        images: ["/logo.png"]
    }
};

export default function Home() {
  return (
    <div>
      <Showcase />
      <ShopByCategory />
      <NewArrivals />
      <Reveal>
        <TrustBadges />
      </Reveal>
      <TopSelling />
      <AllProducts />
      <CustomerReviews />
    </div>
  );
}
