/*
 * SonarQube
 * Copyright (C) 2009-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as React from 'react';
import { KeyboardKeys } from '../../../helpers/keycodes';
import { translate } from '../../../helpers/l10n';
import FormattingTips from '../../common/FormattingTips';
import { Button, ResetButtonLink } from '../../controls/buttons';

export interface CommentFormProps {
  comment?: string;
  onCancel: () => void;
  onSaveComment: (comment: string) => void;
  placeholder?: string;
  showFormatHelp: boolean;
  autoTriggered?: boolean;
}

export default function CommentForm(props: CommentFormProps) {
  const { comment, placeholder, showFormatHelp, autoTriggered } = props;
  const [editComment, setEditComment] = React.useState(comment || '');

  return (
    <>
      <div className="issue-comment-form-text">
        <textarea
          autoFocus
          className="sw-w-full"
          style={{ resize: 'vertical' }}
          placeholder={placeholder}
          aria-label={translate('issue.comment.enter_comment')}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setEditComment(event.target.value);
          }}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.nativeEvent.key === KeyboardKeys.Enter && (event.metaKey || event.ctrlKey)) {
              props.onSaveComment(editComment);
              setEditComment('');
            }
          }}
          rows={2}
          value={editComment}
        />
      </div>
      <div className="sw-flex sw-justify-between issue-comment-form-footer">
        {showFormatHelp && (
          <div className="issue-comment-form-tips">
            <FormattingTips />
          </div>
        )}
        <div>
          <div className="issue-comment-form-actions">
            <Button
              className="js-issue-comment-submit"
              disabled={editComment.trim().length < 1}
              onClick={() => {
                props.onSaveComment(editComment);
                setEditComment('');
              }}
            >
              {comment ? translate('save') : translate('issue.comment.formlink')}
            </Button>
            <ResetButtonLink
              className="js-issue-comment-cancel little-spacer-left"
              aria-label={
                comment
                  ? translate('issue.comment.edit.cancel')
                  : translate('issue.comment.add_comment.cancel')
              }
              onClick={props.onCancel}
            >
              {autoTriggered ? translate('skip') : translate('cancel')}
            </ResetButtonLink>
          </div>
        </div>
      </div>
    </>
  );
}
