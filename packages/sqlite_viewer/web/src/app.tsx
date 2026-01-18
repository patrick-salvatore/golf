import { ParentComponent } from 'solid-js';
import Sidebar from './components/sidebar';

const App: ParentComponent = (props) => {
  return (
    <div class="flex h-screen bg-gray-100">
      <Sidebar />
      <main class="flex-1 overflow-auto p-4">
        {props.children}
      </main>
    </div>
  );
};

export default App;
