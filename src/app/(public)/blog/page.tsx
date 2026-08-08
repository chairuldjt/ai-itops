import { NewspaperIcon, ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FadeIn,
  FadeInStagger,
  FadeInItem,
} from "@/components/motion";

const placeholderPosts = [
  {
    title: "Building a Unified AI Gateway from Scratch",
    description:
      "Lessons learned from creating a single API endpoint for a broad model catalog with credit tracking and streaming.",
    date: "Coming soon",
  },
  {
    title: "Graceful Capability Handling for Vision Models",
    description:
      "How we built per-model image policies that prevent crashes when non-vision models receive images.",
    date: "Coming soon",
  },
  {
    title: "One Key, Every Model: Unified Routing Explained",
    description:
      "How a single OpenAI-compatible endpoint routes requests across models with automatic fallback.",
    date: "Coming soon",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <PageHeader
        title="Blog"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <FadeIn delay={0.1}>
        <div className="mt-6">
          <EmptyState
            icon={<NewspaperIcon className="size-7" />}
            title="Blog coming soon"
            description="We're working on technical articles, tutorials, and product updates. Stay tuned!"
          >
            <a
              href="https://x.com/aigateway"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "mt-2" })}
            >
              Follow us on X
              <ArrowRightIcon className="ml-2 size-4" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </EmptyState>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <h2 className="mt-14 mb-6 text-lg font-semibold">Upcoming articles</h2>
      </FadeIn>

      <FadeInStagger stagger={0.1} className="grid gap-5 md:grid-cols-3">
        {placeholderPosts.map((post) => (
          <FadeInItem key={post.title}>
            <Card className="relative h-full opacity-60">
              <Badge
                variant="outline"
                className="absolute right-4 top-4 text-[10px] font-medium"
              >
                Coming Soon
              </Badge>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug pr-16">
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-sm leading-relaxed">
                  {post.description}
                </CardDescription>
                <div className="text-xs text-muted-foreground">{post.date}</div>
              </CardContent>
            </Card>
          </FadeInItem>
        ))}
      </FadeInStagger>
    </div>
  );
}
