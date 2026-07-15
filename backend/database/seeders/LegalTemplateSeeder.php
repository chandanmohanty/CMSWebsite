<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

/**
 * "Advocate Pro" - a legal-services template: hero with consultation CTA,
 * trust stats, value-proposition cards, practice areas, how-it-works,
 * about, FAQ and a contact form. Light design with blue/teal accents.
 */
class LegalTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $template = Template::updateOrCreate(
            ['slug' => 'advocate-pro'],
            [
                'name' => 'Advocate Pro',
                'industry' => 'law',
                'description' => 'Consultation-focused template for law firms and legal-services platforms: practice areas, how-it-works, FAQs and a consultation form.',
                'design_tokens' => [
                    'colors' => ['primary' => '#1b2b4b', 'secondary' => '#12203c', 'accent' => '#efb639'],
                    'typography' => ['heading' => 'Georgia', 'body' => 'system-ui'],
                    'radius' => '0.5rem',
                ],
                'default_settings' => [
                    'header' => [
                        'style' => 'dark',
                        'sticky' => true,
                        'show_language' => true,
                        'secondary_cta' => ['label' => 'Register as a Lawyer', 'url' => '/contact'],
                        'cta' => ['label' => 'Talk to a Lawyer', 'url' => '/contact'],
                    ],
                    'footer' => [
                        'company_info' => 'Clear legal help for people and businesses — confidential consultations, honest fees.',
                        'copyright' => '© '.date('Y').' Your Firm Name. All rights reserved.',
                    ],
                ],
                'is_active' => true,
            ]
        );

        $layouts = [
            ['page_type' => 'home', 'name' => 'Home', 'structure' => [
                ['block_type' => 'hero', 'default_settings' => ['variant' => 'centered'], 'default_content' => [
                    'badge' => 'Trusted legal help, online & in person',
                    'heading' => 'Clear legal help, when you need it most',
                    'subheading' => 'Talk to an experienced advocate today — confidential guidance for civil, criminal, family and business matters.',
                    'cta' => ['label' => 'Talk to a Lawyer', 'url' => '/contact'],
                    'cta2' => ['label' => 'Explore services', 'url' => '/services'],
                ]],
                ['block_type' => 'stats', 'default_content' => [
                    'items' => [
                        ['value' => '1,200+', 'label' => 'Verified advocates'],
                        ['value' => '25,000+', 'label' => 'Consultations completed'],
                        ['value' => '50+', 'label' => 'Cities served'],
                    ],
                ]],
                ['block_type' => 'services_grid', 'default_settings' => ['variant' => 'glass'], 'default_content' => [
                    'heading' => 'Why clients choose us',
                    'subheading' => 'Legal help designed around you — private, reachable and honestly priced.',
                    'items' => [
                        ['icon' => '🔒', 'title' => '100% Confidential', 'text' => 'Every consultation is private and protected. Discuss your matter freely and safely.'],
                        ['icon' => '📱', 'title' => 'Easy to Reach', 'text' => 'Start online from anywhere, then meet in person when your case needs it.'],
                        ['icon' => '💰', 'title' => 'Fair, Fixed Fees', 'text' => 'Transparent pricing agreed up front — no surprises, no hidden charges.'],
                    ],
                ]],
                ['block_type' => 'two_panel', 'default_content' => [
                    'heading' => 'Start online, finish strong',
                    'subheading' => 'A hybrid way of working that keeps you safe, informed and represented.',
                    'panels' => [
                        ['title' => 'Start safe — online', 'text' => 'Get clarity before you commit.', 'points' => "Confidential consultation from home\nDocument review and honest first opinion\nClear fee quote before any work begins"],
                        ['title' => 'Move strong — in person', 'text' => 'When your matter goes to court, we are there.', 'points' => "Experienced advocates at every hearing\nRegular updates in plain language\nOne team from filing to final order"],
                    ],
                ]],
                ['block_type' => 'services_grid', 'default_content' => [
                    'heading' => 'Our practice areas',
                    'items' => [
                        ['icon' => '⚖️', 'title' => 'Criminal Defence', 'text' => 'Bail, trials and appeals handled with urgency and discretion.'],
                        ['icon' => '🏛️', 'title' => 'Civil Litigation', 'text' => 'Recovery suits, injunctions and dispute resolution in all courts.'],
                        ['icon' => '👪', 'title' => 'Family Law', 'text' => 'Divorce, maintenance, custody and settlements handled with care.'],
                        ['icon' => '🏠', 'title' => 'Property Disputes', 'text' => 'Title verification, partition suits and tenancy matters.'],
                        ['icon' => '🏢', 'title' => 'Corporate & Startups', 'text' => 'Contracts, compliance and advisory for growing businesses.'],
                        ['icon' => '🛡️', 'title' => 'Consumer Protection', 'text' => 'Claims against unfair trade practices and deficient services.'],
                    ],
                ]],
                ['block_type' => 'testimonials', 'default_content' => [
                    'heading' => 'What our clients say',
                    'items' => [
                        ['quote' => 'They explained my options in plain language and stood by me through the whole case.', 'name' => 'R. Sharma'],
                        ['quote' => 'Quick to respond, honest about costs, and thoroughly prepared at every hearing.', 'name' => 'A. Fernandes'],
                        ['quote' => 'The online consultation saved me weeks. I knew exactly where I stood the same day.', 'name' => 'P. Iyer'],
                    ],
                ]],
                ['block_type' => 'faq', 'default_content' => [
                    'heading' => 'Frequently asked questions',
                    'items' => [
                        ['question' => 'Is my first consultation confidential?', 'answer' => 'Yes. Everything you share is protected by advocate–client privilege from the very first conversation.'],
                        ['question' => 'How are fees decided?', 'answer' => 'After understanding your matter we quote a fixed fee or a clear stage-wise estimate before any work begins.'],
                        ['question' => 'Can everything be handled online?', 'answer' => 'Consultations, document review and advice can happen online. Court appearances are handled in person by your advocate.'],
                        ['question' => 'How quickly can I speak to a lawyer?', 'answer' => 'Most consultation requests are scheduled within one working day.'],
                    ],
                ]],
                ['block_type' => 'cta', 'default_content' => [
                    'heading' => 'Need legal help right now?',
                    'subheading' => 'Tell us about your matter and get a confidential first consultation within one working day.',
                    'cta' => ['label' => 'Talk to a Lawyer', 'url' => '/contact'],
                ]],
            ]],

            ['page_type' => 'about', 'name' => 'About Us', 'structure' => [
                ['block_type' => 'hero', 'default_settings' => ['variant' => 'compact'], 'default_content' => [
                    'heading' => 'About our firm',
                    'subheading' => 'Two decades of standing up for clients in courtrooms and boardrooms.',
                ]],
                ['block_type' => 'rich_text', 'default_content' => [
                    'html' => '<h2>Who we are</h2><p>We are a full-service legal practice built on a simple belief: everyone deserves clear advice, honest fees and an advocate who fights for them. Our team combines seasoned courtroom experience with a modern, client-first way of working.</p><p>Edit this section in the page builder to tell your firm\'s own story - your history, your values and the results you are proud of.</p>',
                ]],
                ['block_type' => 'team_grid', 'default_content' => ['heading' => 'Our leadership', 'items' => [
                    ['name' => 'Adv. Your Name', 'role' => 'Founder & Senior Advocate', 'image' => ''],
                    ['name' => 'Adv. Partner Name', 'role' => 'Partner — Civil Litigation', 'image' => ''],
                ]]],
                ['block_type' => 'cta', 'default_content' => ['heading' => 'Work with a team that puts you first', 'cta' => ['label' => 'Get in touch', 'url' => '/contact']]],
            ]],

            ['page_type' => 'services', 'name' => 'Legal Services', 'structure' => [
                ['block_type' => 'hero', 'default_settings' => ['variant' => 'compact'], 'default_content' => [
                    'heading' => 'Legal services',
                    'subheading' => 'Focused expertise across the matters that affect people and businesses most.',
                ]],
                ['block_type' => 'services_grid', 'default_content' => [
                    'heading' => 'Practice areas',
                    'items' => [
                        ['title' => 'Criminal Defence', 'text' => 'Bail applications, trial defence and criminal appeals at every level.'],
                        ['title' => 'Civil Litigation', 'text' => 'Money recovery, injunctions, damages and enforcement proceedings.'],
                        ['title' => 'Family Law', 'text' => 'Divorce, maintenance, custody, adoption and mutual settlements.'],
                        ['title' => 'Property & Real Estate', 'text' => 'Due diligence, registration disputes, partition and tenancy.'],
                        ['title' => 'Corporate Advisory', 'text' => 'Incorporation, contracts, employment and regulatory compliance.'],
                        ['title' => 'Consumer Cases', 'text' => 'Complaints and appeals before consumer commissions.'],
                        ['title' => 'Cheque Bounce & Recovery', 'text' => 'Notices, prosecution and settlement of dishonoured instruments.'],
                        ['title' => 'Documentation', 'text' => 'Agreements, wills, deeds and notices drafted and vetted.'],
                    ],
                ]],
                ['block_type' => 'cta', 'default_content' => ['heading' => 'Not sure where your matter fits?', 'cta' => ['label' => 'Ask an advocate', 'url' => '/contact']]],
            ]],

            ['page_type' => 'contact', 'name' => 'Contact', 'structure' => [
                ['block_type' => 'hero', 'default_settings' => ['variant' => 'compact'], 'default_content' => [
                    'heading' => 'Talk to an advocate',
                    'subheading' => 'Tell us briefly about your matter — we usually respond within one working day.',
                ]],
                ['block_type' => 'form_embed', 'default_content' => ['heading' => 'Request a consultation', 'form_slug' => 'consultation']],
                ['block_type' => 'rich_text', 'default_content' => [
                    'html' => '<h2>Visit our office</h2><p>Replace this with your address, phone number and office hours from the page builder.</p>',
                ]],
            ]],
        ];

        foreach ($layouts as $layout) {
            $template->layouts()->updateOrCreate(
                ['page_type' => $layout['page_type'], 'name' => $layout['name']],
                ['structure' => $layout['structure']]
            );
        }
    }
}
