import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiHelper } from '@/lib/api';
import { ArrowLeft, ExternalLink, Github, Loader2, Star } from 'lucide-react';
import GitHubReadmeContent from '@/components/GitHubReadmeContent';

const isValidGithubRepoUrl = (value) => {
    try {
        const url = new URL(value);
        if (!['github.com', 'www.github.com'].includes(url.hostname)) return false;
        const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
        return parts.length >= 2;
    } catch {
        return false;
    }
};

export default function GitHubInstallDialog({ botId, onInstall, onCancel, isInstalling }) {
    const { t } = useTranslation('plugins');
    const [step, setStep] = useState('url');
    const [repoUrl, setRepoUrl] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState('');
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState('__latest__');

    const versionOptions = useMemo(() => {
        const options = [];

        if (preview?.latestReleaseTag) {
            options.push({
                value: preview.latestReleaseTag,
                label: `${t('githubInstall.versionRelease')}: ${preview.latestReleaseTag}`
            });
        }

        if (preview?.tags?.length) {
            preview.tags.forEach(tag => {
                if (tag.name !== preview.latestReleaseTag) {
                    options.push({
                        value: tag.name,
                        label: `${t('githubInstall.versionTagPrefix')}: ${tag.name}`
                    });
                }
            });
        }

        return options;
    }, [preview, t]);

    const handleUrlChange = (value) => {
        setRepoUrl(value);
        setPreview(null);
        setPreviewError('');
        setSelectedVersion('__latest__');
        if (step !== 'url') {
            setStep('url');
        }
    };

    const handleLoadPreview = async (e) => {
        e.preventDefault();
        const normalizedUrl = repoUrl.trim();
        if (!normalizedUrl) {
            return;
        }
        if (!isValidGithubRepoUrl(normalizedUrl)) {
            setPreviewError(t('githubInstall.urlHint'));
            return;
        }

        setIsLoadingPreview(true);
        setPreview(null);
        setPreviewError('');
        setSelectedVersion('__latest__');

        try {
            const data = await apiHelper(`/api/bots/${botId}/plugins/install/github/preview`, {
                method: 'POST',
                body: { repoUrl: normalizedUrl }
            });
            setPreview(data);
            setStep('preview');
        } catch (error) {
            setPreviewError(error.message);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleInstall = (e) => {
        e.preventDefault();
        if (!repoUrl.trim()) {
            return;
        }

        const selectedTag = selectedVersion === '__latest__' ? null : selectedVersion;
        onInstall(repoUrl.trim(), selectedTag);
    };

    const isPreviewStep = step === 'preview' && !!preview;

    return (
        <DialogContent
            className={
                isPreviewStep
                    ? "max-w-4xl h-[85vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0"
                    : "max-w-lg"
            }
        >
            <DialogHeader>
                <DialogTitle className={isPreviewStep ? "px-6 pt-6" : undefined}>{t('githubInstall.title')}</DialogTitle>
                <DialogDescription className={isPreviewStep ? "px-6" : undefined}>
                    {isPreviewStep ? t('githubInstall.previewStepDescription') : t('githubInstall.description')}
                </DialogDescription>
            </DialogHeader>

            {isPreviewStep ? (
                <form id="github-install-form" onSubmit={handleInstall} className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
                    <div className="space-y-4 overflow-y-auto py-4">
                        <div className="rounded-lg border bg-muted/20 p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                        <Github className="h-3.5 w-3.5" />
                                        {t('githubInstall.previewTitle')}
                                    </div>
                                    <div className="text-xl font-semibold">{preview.repo.fullName}</div>
                                    {preview.repo.description && (
                                        <p className="text-sm text-muted-foreground">{preview.repo.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span>{t('githubInstall.defaultBranch')}: {preview.repo.defaultBranch}</span>
                                        <span className="inline-flex items-center gap-1">
                                            <Star className="h-3.5 w-3.5" />
                                            {preview.repo.stars}
                                        </span>
                                        <span>{t('githubInstall.latestRelease')}: {preview.latestReleaseTag || t('githubInstall.noTags')}</span>
                                    </div>
                                </div>

                                <Button variant="outline" size="sm" asChild>
                                    <a href={preview.repo.htmlUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        GitHub
                                    </a>
                                </Button>
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-2">
                                <Label htmlFor="github-version">{t('githubInstall.selectVersion')}</Label>
                                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                                    <SelectTrigger id="github-version" className="max-w-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__latest__">{t('githubInstall.versionLatest')}</SelectItem>
                                        {versionOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {t('githubInstall.versionHint')}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <div className="text-sm font-medium">{t('githubInstall.readmeTitle')}</div>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto">
                                {preview.readmeHtml ? (
                                    <GitHubReadmeContent
                                        html={preview.readmeHtml}
                                        className="min-h-full"
                                    />
                                ) : (
                                    <div className="px-4 py-4 text-sm text-muted-foreground">
                                        {t('githubInstall.noReadme')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4 border-t pt-4">
                        <Button type="button" variant="ghost" onClick={() => setStep('url')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('githubInstall.back')}
                        </Button>
                        <Button type="submit" disabled={isInstalling}>
                            {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isInstalling ? t('messages.installing') : t('githubInstall.install')}
                        </Button>
                    </DialogFooter>
                </form>
            ) : (
                <form id="github-preview-form" onSubmit={handleLoadPreview} className="py-4">
                    <div className="space-y-2">
                        <Label htmlFor="repoUrl">{t('githubInstall.urlLabel')}</Label>
                        <Input
                            id="repoUrl"
                            value={repoUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            placeholder={t('githubInstall.urlPlaceholder')}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('githubInstall.urlHint')}
                        </p>
                    </div>

                    {previewError && (
                        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            {previewError}
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            {t('actions.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoadingPreview || !repoUrl.trim()}>
                            {isLoadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoadingPreview ? t('githubInstall.loadingPreview') : t('githubInstall.continue')}
                        </Button>
                    </DialogFooter>
                </form>
            )}
        </DialogContent>
    );
}
