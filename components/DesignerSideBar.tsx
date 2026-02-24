import useDesigner from "./hooks/useDesigner";
import FormElementsSidebar from "./FormElementsSideBar";
import PropertiesFormSidebar from "./PropertiesFormSidebar";
import { View, useTheme } from "@aws-amplify/ui-react";

function DesignerSidebar() {
  const { selectedElement } = useDesigner();
  const { tokens } = useTheme();

  // Set width depending on state
  const sidebarWidth = selectedElement ? "50%" : "10%"; // wider for properties

  return (
    <View
      width={sidebarWidth}

      padding={tokens.space.medium}
      style={{
        borderLeft: `1px solid ${tokens.colors.border.primary}`,
        position: "sticky",
        top: 0,                 // ⭐ REQUIRED
        height: "100vh",
        overflowY: "auto",      // ⭐ allows internal scrolling
        transition: "width 0.3s ease",
      }}
    >
      {!selectedElement && <FormElementsSidebar />}
      {selectedElement && <PropertiesFormSidebar />}
    </View>
  );
}

export default DesignerSidebar;