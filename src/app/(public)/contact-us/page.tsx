"use client";

import { useState } from "react";
import {
  MailIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, FadeInStagger, FadeInItem } from "@/components/motion";

const socialLinks = [
  { label: "Email", value: "support@aigateway.dev", href: "mailto:support@aigateway.dev", icon: <MailIcon className="size-4" /> },
  { label: "Discord", value: "discord.gg/aigateway", href: "https://discord.gg/aigateway", icon: <MessageSquareIcon className="size-4" /> },
  { label: "X / Twitter", value: "@aigateway", href: "https://x.com/aigateway", icon: <ExternalLinkIcon className="size-4" /> },
  { label: "LinkedIn", value: "/company/aigateway", href: "https://linkedin.com/company/aigateway", icon: <ExternalLinkIcon className="size-4" /> },
  { label: "GitHub", value: "/aigateway", href: "https://github.com/aigateway", icon: <ExternalLinkIcon className="size-4" /> },
];

export default function ContactUsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      toast.success("Message sent! We'll get back to you soon.");
    }, 800);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <PageHeader
        title="Contact Us"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
        description="Have a question or feedback? We'd love to hear from you."
      />

      <div className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        {/* Form */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Sending..." : "Send message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Contact info */}
        <FadeInStagger stagger={0.08}>
          <div className="space-y-4">
            <FadeInItem>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Get in touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {link.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium">{link.label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {link.value}
                        </div>
                      </div>
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </FadeInItem>

            <FadeInItem>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <MessageSquareIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium">Quick response</p>
                    <p className="mt-0.5 text-muted-foreground">
                      We typically respond within 24 hours on business days.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeInItem>
          </div>
        </FadeInStagger>
      </div>
    </div>
  );
}
