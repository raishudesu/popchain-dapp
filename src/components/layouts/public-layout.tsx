import { Outlet } from "react-router";
import Footer from "@/components/footer";
import Nav from "../nav";

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Nav />
      <Outlet />
      <Footer />
    </div>
  );
};

export default PublicLayout;
