import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Brand } from '@/constants/theme';

/**
 * Harbor's module shell. Five modules ship now; Running / Weight / Sleep
 * are reserved future modules (see PLAN.md §6) and will be added as the
 * health-tracker grows beyond the meal planner.
 */
export default function AppTabs() {
  return (
    <NativeTabs tintColor={Brand.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="recipes">
        <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shopping">
        <NativeTabs.Trigger.Label>Shopping</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="nutritionist">
        <NativeTabs.Trigger.Label>Nutritionist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="stethoscope" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
