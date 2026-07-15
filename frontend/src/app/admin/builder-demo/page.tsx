"use client";

import { useMemo } from "react";
import { PageBuilder, newUid, type BuilderSection } from "@/components/builder/PageBuilder";
import { createMockMediaApi } from "@/lib/media-mock";

/**
 * Standalone builder playground with sample content - works without the
 * Laravel backend. Useful for trying the builder and for UI development.
 * Saving only simulates a request; nothing is persisted.
 */

const demoSections: BuilderSection[] = [
  {
    uid: newUid(),
    block_type: "hero",
    content: {
      heading: "Compassionate care, advanced medicine",
      subheading: "Serving our community with world-class healthcare.",
      cta: { label: "Book an appointment", url: "/contact" },
    },
    settings: { variant: "centered" },
    is_visible: true,
  },
  {
    uid: newUid(),
    block_type: "services_grid",
    content: {
      heading: "Our departments",
      items: [
        { title: "Cardiology", text: "Complete heart care from prevention to surgery." },
        { title: "Pediatrics", text: "Specialist care for children of every age." },
        { title: "Orthopedics", text: "Bone, joint and mobility treatments." },
      ],
    },
    settings: null,
    is_visible: true,
  },
  {
    uid: newUid(),
    block_type: "testimonials",
    content: {
      heading: "Patient stories",
      items: [
        { quote: "The staff treated me like family.", name: "Priya S." },
        { quote: "Fast, professional and truly caring.", name: "Rahul M." },
      ],
    },
    settings: null,
    is_visible: true,
  },
  {
    uid: newUid(),
    block_type: "cta",
    content: { heading: "Need a specialist?", cta: { label: "Find a doctor", url: "/team" } },
    settings: null,
    is_visible: true,
  },
];

export default function BuilderDemo() {
  const mediaApi = useMemo(createMockMediaApi, []);

  return (
    <PageBuilder
      pageTitle="Builder demo (not persisted)"
      pageStatus="draft"
      initialSections={demoSections}
      backHref="/admin"
      mediaApi={mediaApi}
      onSave={async () => {
        await new Promise((r) => setTimeout(r, 400)); // simulate a request
      }}
    />
  );
}
