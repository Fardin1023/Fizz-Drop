import React from 'react';
import { Heart } from 'lucide-react';

interface WishlistProps {
  count?: number;
}

const Wishlist: React.FC<WishlistProps> = ({ count = 0 }) => {
  return (
    <a
      href="/wishlist"
      className="relative p-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all duration-200 inline-flex items-center justify-center group active:scale-95"
      aria-label="Wishlist"
    >
      <Heart className="w-5 h-5 transition-transform group-hover:scale-110 duration-150" />
      {count > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold leading-none text-white bg-rose-500 rounded-full min-w-[17px] h-[17px] ring-2 ring-white dark:ring-zinc-900">
          {count}
        </span>
      )}
    </a>
  );
};

export default Wishlist;