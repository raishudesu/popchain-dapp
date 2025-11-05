import BackButton from "@/components/back-button";
import { SettingsForm } from "@/components/settings-form";

const AttendeeSettings = () => {
  return (
    <div className="container p-8">
      <BackButton />
      <div className="mt-8">
        <SettingsForm />
      </div>
    </div>
  );
};

export default AttendeeSettings;
