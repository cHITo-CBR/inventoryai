@echo off
setlocal enabledelayedexpansion

echo Deleting temporary files...

if exist "quotas-page-temp.tsx" (
    del /Q "quotas-page-temp.tsx"
    echo Deleted: quotas-page-temp.tsx
) else (
    echo Not found: quotas-page-temp.tsx
)

if exist "quota-table-temp.tsx" (
    del /Q "quota-table-temp.tsx"
    echo Deleted: quota-table-temp.tsx
) else (
    echo Not found: quota-table-temp.tsx
)

if exist "quota-form-dialog-temp.tsx" (
    del /Q "quota-form-dialog-temp.tsx"
    echo Deleted: quota-form-dialog-temp.tsx
) else (
    echo Not found: quota-form-dialog-temp.tsx
)

if exist "app\admin\quotas.placeholder" (
    del /Q "app\admin\quotas.placeholder"
    echo Deleted: app\admin\quotas.placeholder
) else (
    echo Not found: app\admin\quotas.placeholder
)

echo.
echo Cleanup completed.
