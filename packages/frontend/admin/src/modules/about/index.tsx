import { ScrollArea } from '@affine/admin/components/ui/scroll-area';

import { Header } from '../header';
import { AboutStrawNote } from './about';

export function ConfigPage() {
  return (
    <div className="h-dvh flex-1 space-y-1 flex-col flex">
      <Header title="Server" />
      <ScrollArea>
        <AboutStrawNote />
      </ScrollArea>
    </div>
  );
}

export { ConfigPage as Component };
