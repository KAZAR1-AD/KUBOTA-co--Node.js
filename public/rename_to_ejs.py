import os
import glob

def batch_rename_to_ejs(input_pattern, output_extension):
    """
    指定されたパターンに一致するHTMLファイルを読み込み、
    内容を変更せずに拡張子をEJSに変更した新しいファイルとして保存します。
    （元のHTMLファイルは変更・削除されません）
    """
    
    # 1. パターンに一致するファイルリストを取得
    # FIN001.html から FIN018.html までを見つけます
    html_files = glob.glob(input_pattern)
    
    if not html_files:
        print(f"❌ エラー: パターン '{input_pattern}' に一致するファイルが見つかりませんでした。")
        return

    print(f"✅ {len(html_files)}個のファイルを見つけました。拡張子の変換を開始します...")
    
    # 2. 各ファイルを処理
    for input_filename in html_files:
        # 例: FIN001.html から FIN001.ejs のファイル名を生成
        base_name = os.path.splitext(input_filename)[0] # 拡張子 (.html) を除去
        output_filename = base_name + output_extension

        try:
            # HTMLファイルの内容をそのまま読み込む
            with open(input_filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # EJSファイルとして**新しく**保存する
            with open(output_filename, 'w', encoding='utf-8') as f:
                f.write(content)
                
            print(f"  -> '{input_filename}' から '{output_filename}' を作成完了。")

        except Exception as e:
            print(f"❌ エラー: '{input_filename}' の処理中に問題が発生しました: {e}")

# 実行設定
# 対象ファイル名パターン: 'FIN???.html' に一致するファイル
INPUT_PATTERN = 'FIN???.html'
# 出力ファイルの拡張子
OUTPUT_EXTENSION = '.ejs'

# 変換実行
batch_rename_to_ejs(INPUT_PATTERN, OUTPUT_EXTENSION)
