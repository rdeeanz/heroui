import type {Meta, StoryObj} from "@storybook/react";

import {Text} from "./index";

const meta: Meta<typeof Text> = {
  argTypes: {
    align: {
      control: "select",
      options: ["start", "center", "end", "justify"],
    },
    color: {
      control: "select",
      options: ["default", "muted"],
    },
    type: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6", "body", "body-sm", "body-xs", "code"],
    },
    weight: {
      control: "select",
      options: ["normal", "medium", "semibold", "bold"],
    },
  },
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Components/Typography/Text",
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "HeroUI Text",
    type: "body",
  },
};

export const Primitives: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <Text.Heading level={1}>Dashboard</Text.Heading>
      <Text.Paragraph>
        Convenience primitives are thin wrappers over Text for explicit composition.
      </Text.Paragraph>
      <Text.Code>pnpm add @heroui/react</Text.Code>
    </div>
  ),
};
