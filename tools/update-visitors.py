"""Fetch GoatCounter's read-only statistics; no third-party Python dependencies."""
import datetime as dt
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


class SiteConfig(HTMLParser):
    code = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'section' and attrs.get('id') == 'visitors':
            self.code = attrs.get('data-goatcounter-code')


def nonnegative_count(value):
    if type(value) is not int or value < 0:
        raise ValueError('Invalid visitor count in API response')
    return value


def update():
    token = os.environ.get('GOATCOUNTER_TOKEN', '')
    if not token:
        print('GOATCOUNTER_TOKEN is missing; skipping visitor stats successfully.')
        return
    config = SiteConfig()
    config.feed((ROOT / 'index.html').read_text())
    if not config.code or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', config.code):
        raise ValueError('Invalid data-goatcounter-code in index.html')
    start = dt.date.fromisoformat(os.environ['GOATCOUNTER_START'])
    now = dt.datetime.now(dt.timezone.utc)
    # Use a common completed UTC-hour boundary for total and all location pages.
    end = now.replace(minute=0, second=0, microsecond=0)
    if start > end.date():
        raise ValueError('GOATCOUNTER_START must not be in the future')
    params = {'start': f'{start.isoformat()}T00:00:00Z', 'end': end.strftime('%Y-%m-%dT%H:00:00Z')}

    def get(endpoint, **extra):
        query = urlencode(dict(params, **extra))
        request = Request(f'https://{config.code}.goatcounter.com/api/v0/stats/{endpoint}?{query}',
                          headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
        # Stay below GoatCounter's four requests/second limit, including pagination.
        time.sleep(0.3)
        with urlopen(request, timeout=30) as response:
            return json.load(response)

    total = nonnegative_count(get('total')['total'])
    countries, offset = {}, 0
    while True:
        page = get('locations', limit=100, offset=offset)
        rows = page['stats']
        for row in rows:
            code = str(row.get('id', '')).upper()
            if not re.fullmatch(r'[A-Z]{2}', code):
                code = 'ZZ'
            entry = countries.setdefault(code, {'code': code, 'name': row.get('name') or 'Unknown', 'count': 0})
            entry['count'] += nonnegative_count(row['count'])
        if not page['more']:
            break
        if not rows:
            raise ValueError('Empty location page with more=true')
        offset += len(rows)
    data = {'sample': False, 'updated': now.date().isoformat(), 'since': start.strftime('%Y-%m'),
            'total': total, 'items': sorted(countries.values(), key=lambda item: (-item['count'], item['code']))}
    target = ROOT / 'data/visitors.js'
    # Every successful build records the refresh date, even if counts are unchanged.
    target.parent.mkdir(exist_ok=True)
    target.write_text('window.VISITORS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'Updated {len(countries)} locations, total {total}.')


if __name__ == '__main__':
    update()
