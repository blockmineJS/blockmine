import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

/**
 * Переиспользуемый диалог подтверждения.
 * @param {object} props
 * @param {boolean} props.open - Состояние, открыт ли диалог
 * @param {function} props.onOpenChange - Функция для изменения состояния open
 * @param {string} props.title - Заголовок диалога
 * @param {string|React.ReactNode} props.description - Описание/тело диалога
 * @param {function} props.onConfirm - Функция, выполняемая при подтверждении
 * @param {string} [props.confirmText='Подтвердить'] - Текст на кнопке подтверждения
 * @param {string} [props.cancelText='Отмена'] - Текст на кнопке отмены
 */
export default function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
            className={buttonVariants({ variant: "destructive" })}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}