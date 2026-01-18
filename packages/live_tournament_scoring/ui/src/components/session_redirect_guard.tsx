import { useNavigate } from "@solidjs/router";
import { createEffect, type ParentComponent } from "solid-js";
import { identity } from "~/state/helpers";
import { useSessionStore } from "~/state/session";

const SessionRedirectGuard: ParentComponent = (props) => {
  const navigate = useNavigate();
  const session = useSessionStore(identity);

    // createEffect(() => {
    //   if (session()) {
    //     navigate("/tournament");
    //   }
    // });

  return props.children;
};

export default SessionRedirectGuard;
