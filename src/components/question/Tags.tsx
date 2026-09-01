
import React from "react";
interface TagsProps {
  tags: string[];
}

const Tags: React.FC<TagsProps> = ({ tags }) => (
  <div className="flex flex-wrap gap-2">
    {tags.map((tag, index) => (
      <span
        key={`${tag}-${index}`}
        className="rounded-full bg-app-action-soft px-2.5 py-1 text-xs text-app-action"
      >
        #{tag}
      </span>
    ))}
  </div>
);

export default Tags;
