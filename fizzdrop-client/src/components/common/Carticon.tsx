import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface CartIconProps {
  count?: number;
}

const CartIcon: React.FC<CartIconProps> = ({ count = 0 }) => {
  return (
    <a
      href="/cart"
      className="relative p-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all duration-200 inline-flex items-center justify-center group active:scale-95"
      aria-label="Shopping Cart"
    >
      <ShoppingBag className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 duration-150" />
      {count > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold leading-none text-white bg-indigo-600 dark:bg-indigo-500 rounded-full min-w-[17px] h-[17px] ring-2 ring-white dark:ring-zinc-900 animate-pulse">
          {count}
        </span>
      )}
    </a>
  );
};

export default CartIcon;