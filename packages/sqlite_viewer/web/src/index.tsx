import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

import './index.css';
import App from './app';
import TableView from './components/table_view';

const queryClient = new QueryClient();

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Router root={App}>
        <Route path="/" component={() => <div class="p-8 text-gray-500">Select a table to view data</div>} />
        <Route path="/table/:name" component={TableView} />
      </Router>
    </QueryClientProvider>
  ),
  root!,
);
