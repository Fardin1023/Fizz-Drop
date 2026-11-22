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
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-[#EDF7F7] text-[#FF6A00] border border-[#9BD8DA] mb-2 shadow-2xs">
            {badge}
          </span>
        )}
        <h2 className="font-oswald text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#1A282A]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[#6B8487] mt-1 max-w-lg font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {actionText && (
        <Link
          to={actionHref}
          className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#FF6A00] hover:text-[#E55F00] transition-colors"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
};

export default SectionsHeading;