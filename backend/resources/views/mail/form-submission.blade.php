<x-mail::message>
# New form submission

**{{ $formName }}** on **{{ $websiteName }}** received a new submission on {{ $submittedAt }}.

<x-mail::table>
| Field | Value |
|:------|:------|
@foreach ($rows as $row)
| {{ $row['label'] }} | {{ $row['value'] }} |
@endforeach
</x-mail::table>

Submission #{{ $submissionId }} — open the CMS admin under **Forms → Submissions** to manage it.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
