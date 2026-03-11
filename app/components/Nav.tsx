import { useState } from 'react';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@radix-ui/react-navigation-menu';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Dialog, DialogTrigger, DialogContent } from '@radix-ui/react-dialog';

function Sidebar() {
  return (
    <NavigationMenu>
      <NavigationMenuItem>
        <NavigationMenuLink href="/dashboard">Dashboard</NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink href="/settings">Settings</NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink href="/profile">Profile</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenu>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button>
          <HamburgerMenuIcon />
        </button>
      </DialogTrigger>
      <DialogContent>
        <Sidebar />
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  return (
    <div>
      <div className="desktop-sidebar">
        <Sidebar />
      </div>
      <div className="mobile-menu">
        <MobileMenu />
      </div>
    </div>
  );
}
