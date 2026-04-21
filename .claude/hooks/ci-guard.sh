#!/bin/bash
# Run CI checks after implementation. If they fail, keep Claude active to fix them.

OUTPUT=$(make check 2>&1)
EXIT=$?

if [ $EXIT -eq 0 ]; then
  exit 0
fi

echo "$OUTPUT" | python3 -c "
import sys, json
output = sys.stdin.read()
result = {
    'continue': False,
    'hookSpecificOutput': {
        'hookEventName': 'Stop',
        'additionalContext': 'CIチェックが失敗しました。以下のエラーを全て修正してください:\n\n' + output[-4000:]
    }
}
print(json.dumps(result))
"
