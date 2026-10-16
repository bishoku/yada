import { Field } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { useExperienceCopy } from '../../../i18n/useExperienceCopy';
import { Input, Textarea } from '../../ui/Field';
import { message } from '../../../i18n/messages';
import React from 'react';
import { FolderPlus, AlertCircle, Globe } from 'lucide-react';
import { translations } from '../../../i18n/translations';

interface CreateWorkspaceFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  loading: boolean;
  error: string | null;
  language: 'tr' | 'en';
  onSubmit: (e: React.FormEvent) => void;
  onGoogleSignIn: () => void;
  googleUser: any;
  className?: string;
}

export const CreateWorkspaceForm: React.FC<CreateWorkspaceFormProps> = ({
  name,
  setName,
  description,
  setDescription,
  loading,
  error,
  language,
  onSubmit,
  onGoogleSignIn,
  googleUser,
  className = '',
}) => {
  const t = translations[language];
  const copy = useExperienceCopy();

  return (
    <div className={`w-full ${className}`}>
      <div>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t.workspaceName} hint={copy.workspaceNameHint}>
            <Input type="text" value={name} onChange={event => setName(event.target.value)} disabled={loading} placeholder={t.workspaceNamePlaceholder} maxLength={50} required autoFocus data-dialog-autofocus="" />
          </Field>
          <Field label={t.description} hint={copy.descriptionHint}>
            <Textarea value={description} onChange={event => setDescription(event.target.value)} disabled={loading} placeholder={t.descriptionPlaceholder} rows={3} maxLength={200} />
          </Field>
          {error && <div className="yada-field-error flex items-start gap-2" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
          <Button type="submit" busy={loading} disabled={!name.trim()} className="w-full"><FolderPlus size={18} aria-hidden="true" />{t.createButton}</Button>
        </form>

        {import.meta.env.VITE_ENABLE_GOOGLE_SYNC === 'true' && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2.5 text-center">
              {message(language, "CreateWorkspaceForm.cloudSynchronization")}
            </h3>

            {!googleUser ? (
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={loading}
                className="w-full py-2 sm:py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{message(language, "CreateWorkspaceForm.loginWithGoogle")}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="w-4 h-4" />
                  <span>{message(language, "CreateWorkspaceForm.signedIn")}</span>
                </div>
                <p className="text-xs text-slate-500 text-center max-w-[240px]">
                  {message(language, "CreateWorkspaceForm.yourPastProjectsWereSuccessfullyFetchedAnd")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
