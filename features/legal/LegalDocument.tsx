import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

// Renders the markdown subset used by docs/legal: headings, paragraphs,
// bullet lists, simple tables, and **bold** / `code` inline spans.
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] };

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (!line.trim()) {
      i += 1;
    } else if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push({ type: 'list', items });
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((cell) => cell.trim());
        if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
        i += 1;
      }
      blocks.push({ type: 'table', rows });
    } else {
      const text: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3} |- |\|)/.test(lines[i])) {
        text.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'paragraph', text: text.join('\n') });
    }
  }
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={styles.bold}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={index} style={styles.code}>{part.slice(1, -1)}</Text>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function LegalDocument({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.column}>
        <View style={styles.nav}>
          <Link href="/" style={styles.navLink}>RodoFlow</Link>
          <View style={styles.navRight}>
            <Link href="/privacy" style={styles.navLink}>Privacy</Link>
            <Link href="/terms" style={styles.navLink}>Terms</Link>
          </View>
        </View>
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            const style = block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
            return (
              <Text key={index} style={style} role="heading" aria-level={block.level}>
                {renderInline(block.text)}
              </Text>
            );
          }
          if (block.type === 'list') {
            return (
              <View key={index} style={styles.list}>
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.listItem}>
                    <Text style={styles.bullet}>{'•'}</Text>
                    <Text style={styles.listText}>{renderInline(item)}</Text>
                  </View>
                ))}
              </View>
            );
          }
          if (block.type === 'table') {
            return (
              <View key={index} style={styles.table}>
                {block.rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={[styles.tableRow, rowIndex === 0 && styles.tableHeader]}>
                    {row.map((cell, cellIndex) => (
                      <Text key={cellIndex} style={[styles.tableCell, rowIndex === 0 && styles.bold]}>
                        {renderInline(cell)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          return <Text key={index} style={styles.paragraph}>{renderInline(block.text.replace(/\n/g, ' '))}</Text>;
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#ffffff' },
  pageContent: { paddingHorizontal: 16, paddingVertical: 24 },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navRight: { flexDirection: 'row', gap: 16 },
  navLink: { color: '#0f766e', fontSize: 14, fontWeight: '600' },
  h1: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 28, marginBottom: 10 },
  h3: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#374151', marginBottom: 12 },
  bold: { fontWeight: '700', color: '#111827' },
  code: { fontFamily: 'monospace', fontSize: 14 },
  list: { marginBottom: 12 },
  listItem: { flexDirection: 'row', marginBottom: 6, paddingRight: 8 },
  bullet: { width: 18, fontSize: 15, lineHeight: 24, color: '#6b7280' },
  listText: { flex: 1, fontSize: 15, lineHeight: 24, color: '#374151' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, marginBottom: 16, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tableHeader: { backgroundColor: '#f3f4f6', borderTopWidth: 0 },
  tableCell: { flex: 1, padding: 10, fontSize: 14, lineHeight: 20, color: '#374151' },
});
