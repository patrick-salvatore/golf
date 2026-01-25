import { type ParentComponent } from 'solid-js';

import InstallPrompt from './pwa/install_prompt';
import GolfLoader from './ui/golf_loader';

import { Header } from './header';

const AppShell: ParentComponent = (props) => {
  return (
    <>
      <Header />
      <main class="flex-1 mx-auto p-3">{props.children}</main>
      <GolfLoader />
      <InstallPrompt />
    </>
  );
};

export default AppShell;
