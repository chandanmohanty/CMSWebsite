<?php

namespace App\Mail;

use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to a form's configured notification recipients when a visitor submits.
 * Queued: with QUEUE_CONNECTION=sync it sends inline; on a real queue driver
 * it never delays the visitor's request.
 */
class FormSubmissionReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Form $form,
        public FormSubmission $submission,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New submission: '.$this->form->name,
        );
    }

    public function content(): Content
    {
        // Show human labels from the schema instead of raw storage keys.
        $labels = collect($this->form->schema['fields'] ?? [])->pluck('label', 'name');

        $rows = collect($this->submission->data)->map(function ($value, $key) use ($labels) {
            $text = is_scalar($value) || $value === null ? (string) $value : json_encode($value);

            return [
                'label' => $labels[$key] ?? $key,
                // Keep the markdown table intact whatever the visitor typed.
                'value' => str_replace(['|', "\r\n", "\n"], ['\\|', ' ', ' '], $text),
            ];
        })->values()->all();

        return new Content(
            markdown: 'mail.form-submission',
            with: [
                'formName' => $this->form->name,
                'websiteName' => $this->form->website?->name ?? 'your website',
                'rows' => $rows,
                'submissionId' => $this->submission->id,
                'submittedAt' => $this->submission->created_at?->toDayDateTimeString(),
            ],
        );
    }
}
