import { createSignal, type Component } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { TextField, TextFieldLabel, TextFieldRoot } from "~/components/ui/textfield";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

const StyleGuide: Component = () => {
  const [activeTab, setActiveTab] = createSignal("typography");

  return (
    <div class="min-h-screen bg-background p-8 text-foreground space-y-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold">Style Guide</h1>
        <p class="text-muted-foreground">
          Visual verification of the Games Client design system (Slate/Emerald Dark Theme).
        </p>
      </div>

      <Tabs value={activeTab()} onChange={setActiveTab} class="w-full">
        <TabsList class="mb-4">
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="typography" class="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Headings</CardTitle>
              <CardDescription>Inter font family (System UI)</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <h1 class="text-4xl font-extrabold lg:text-5xl">Heading 1</h1>
                <h2 class="text-3xl font-semibold first:mt-0">Heading 2</h2>
                <h3 class="text-2xl font-semibold">Heading 3</h3>
                <h4 class="text-xl font-semibold">Heading 4</h4>
                <p class="leading-7 [&:not(:first-child)]:mt-6">
                  The quick brown fox jumps over the lazy dog. Typography should be clean, readable, and consistent with the Stats Client.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" class="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Theme Palette</CardTitle>
              <CardDescription>Semantic color mappings</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorSwatch name="Background" cls="bg-background" text="text-foreground" border />
                <ColorSwatch name="Card" cls="bg-card" text="text-card-foreground" border />
                <ColorSwatch name="Primary" cls="bg-primary" text="text-primary-foreground" />
                <ColorSwatch name="Secondary" cls="bg-secondary" text="text-secondary-foreground" />
                <ColorSwatch name="Muted" cls="bg-muted" text="text-muted-foreground" />
                <ColorSwatch name="Accent" cls="bg-accent" text="text-accent-foreground" />
                <ColorSwatch name="Destructive" cls="bg-destructive" text="text-destructive-foreground" />
                <ColorSwatch name="Border" cls="bg-border" text="text-foreground" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" class="space-y-8">
          <div class="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <TextFieldRoot>
                  <TextFieldLabel>Email</TextFieldLabel>
                  <TextField placeholder="m@example.com" />
                </TextFieldRoot>
                
                <Select
                  placeholder="Select a fruit"
                  options={["Apple", "Banana", "Orange"]}
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                  )}
                >
                  <SelectTrigger>
                    <SelectValue<string>>{state => state.selectedOption()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ColorSwatch = (props: { name: string; cls: string; text: string; border?: boolean }) => (
  <div class="space-y-1.5">
    <div class={`h-20 w-full rounded-md shadow-sm ${props.cls} ${props.border ? "border border-border" : ""} flex items-center justify-center`}>
      <span class={`text-xs font-medium ${props.text}`}>Aa</span>
    </div>
    <div class="text-sm font-medium">{props.name}</div>
  </div>
);

export default StyleGuide;
