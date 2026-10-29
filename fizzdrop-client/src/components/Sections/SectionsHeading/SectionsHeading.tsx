import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionsHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
}

const SectionsHeading: React.FC<SectionsHeadingProps> = ({
  badge,
  title,
  subtitle,
  actionText,
  actionHref = '/shop',
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        {badge && (
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 mb-2">
            {badge}
          </span>
        )}
        <h2 className="font-oswald text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg">
            {subtitle}
          </p>
        )}
      </div>

      {actionText && (
        <Link
          to={actionHref}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
};

export default SectionsHeading;