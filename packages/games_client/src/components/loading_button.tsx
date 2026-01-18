import type { JSXElement } from "solid-js";
import { Button } from "./ui/button";
import Loader from "./loader";
import { cn } from "~/lib/cn";

export function LoadingButton(props: any): JSXElement {
  return (
    <div>
      {props.isLoading() ? (
        <Loader />
      ) : (
        <Button
          {...props}
          class={cn(props.class, "w-full flex justify-center")}
        >
          {props.children}
        </Button>
      )}
    </div>
  );
}
