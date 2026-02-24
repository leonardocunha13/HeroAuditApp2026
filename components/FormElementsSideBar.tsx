import SidebarBtnElement from "./SidebarBtnElement";
import { FormElements } from "./FormElements";
import { View, Text, Grid, useTheme } from "@aws-amplify/ui-react";
import { Separator } from "./ui/separator"; // Use Amplify's if you prefer

function FormElementsSidebar() {
  const { tokens } = useTheme();

  return (
    <View>
      <Text className="text-sm text-gray-900 dark:text-gray-100" fontWeight="bold">
        Drag and drop elements
      </Text>

      <Separator />

      <Grid
        columnGap={tokens.space.small}
        rowGap={tokens.space.xxxs}
        templateColumns={["1fr", "1fr 1fr"]}
        alignItems="start"
        width="80%"
        height="100%"
      >

        <Text
          fontSize={tokens.fontSizes.small}
          fontWeight="bold"
          marginTop={tokens.space.small}
          style={{ gridColumn: "span 2" }}
          className="text-gray-900 dark:text-gray-100"
        >
          Layout elements
        </Text>

        <SidebarBtnElement formElement={FormElements.TitleField} />
        <SidebarBtnElement formElement={FormElements.ParagraphField} />
        <SidebarBtnElement formElement={FormElements.SeparatorField} />
        <SidebarBtnElement formElement={FormElements.SpacerField} />
        <SidebarBtnElement formElement={FormElements.ImageField} />
        <SidebarBtnElement formElement={FormElements.PageBreakField} />

        <Text
          fontSize={tokens.fontSizes.small}
          fontWeight="bold"
          marginTop={tokens.space.small}
          style={{ gridColumn: "span 2", }}
          className="text-gray-900 dark:text-gray-100"
        >
          Form elements
        </Text>

        {/*<SidebarBtnElement formElement={FormElements.TextField} />*/}
        <SidebarBtnElement formElement={FormElements.NumberField} />
        <SidebarBtnElement formElement={FormElements.TextAreaField} />
        <SidebarBtnElement formElement={FormElements.DateField} />
        <SidebarBtnElement formElement={FormElements.SelectField} />
        <SidebarBtnElement formElement={FormElements.CheckboxField} />
        <SidebarBtnElement formElement={FormElements.TableField} />
        <SidebarBtnElement formElement={FormElements.CameraField} />
      </Grid>
    </View>
  );
}

export default FormElementsSidebar;
