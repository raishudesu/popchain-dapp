import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { ArrowLeftIcon } from "lucide-react";

function BackButton() {
  const navigate = useNavigate();

  return (
    <Button onClick={() => navigate(-1)} variant="outline">
      <ArrowLeftIcon className="w-4 h-4" />
      Go Back
    </Button>
  );
}

export default BackButton;
