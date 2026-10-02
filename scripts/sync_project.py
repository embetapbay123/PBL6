"""Copy issue statuses/owners into the existing GitHub Project using gh auth."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

from sync_kanban import COLUMNS, OPEN_STATUSES, OWNERS

ROOT = Path(__file__).resolve().parents[1]


def find_gh():
    executable = shutil.which('gh')
    if executable:
        return executable
    windows = Path(r'C:\Program Files\GitHub CLI\gh.exe')
    if windows.exists():
        return str(windows)
    raise RuntimeError('Install GitHub CLI and run gh auth login --scopes project first')


def api(gh, endpoint, payload=None):
    args = [gh, 'api', endpoint]
    if payload is not None:
        args += ['--method', 'POST', '--input', '-']
    result = subprocess.run(args, input=json.dumps(payload) if payload is not None else None,
                            text=True, encoding='utf-8', capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    data = json.loads(result.stdout)
    if isinstance(data, dict) and data.get('errors'):
        raise RuntimeError(str(data['errors']))
    return data


def graphql(gh, query, **variables):
    return api(gh, 'graphql', {'query': query, 'variables': variables})['data']


def issue_status(issue):
    if issue['state'] == 'closed':
        return None if issue.get('state_reason') == 'not_planned' else 'done'
    statuses = {label['name'][7:] for label in issue['labels'] if label['name'].startswith('status:')}
    if len(statuses) != 1 or not statuses <= OPEN_STATUSES:
        raise RuntimeError(f'Issue #{issue["number"]} needs exactly one valid open status label')
    return next(iter(statuses))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Read/validate only; no Project mutations')
    args = parser.parse_args()
    config = json.loads((ROOT/'docs/implementation/github-project.json').read_text(encoding='utf-8'))
    gh = find_gh()
    project = graphql(gh, 'query($id:ID!){node(id:$id){... on ProjectV2{id url '
                      'fields(first:50){nodes{... on ProjectV2Field{id name} '
                      '... on ProjectV2SingleSelectField{id name options{id name}}}}}}}',
                      id=config['id'])['node']
    if not project or project['url'] != config['url']:
        raise RuntimeError('Project identity does not match the saved configuration')
    fields = project['fields']['nodes']
    status_field = next(field for field in fields if field['name'] == 'Status')
    owner_field = next(field for field in fields if field['name'] == 'Owner')
    options = {option['name']: option['id'] for option in status_field['options']}
    names = dict(COLUMNS)
    if not set(names.values()) <= set(options):
        raise RuntimeError('Project is missing an expected status option')

    # Read all pages and validate every task before making any changes.
    issues = []
    for page in range(1, 101):
        batch = api(gh, f'repos/{config["repository"]}/issues?state=all&sort=created&direction=asc&per_page=100&page={page}')
        issues.extend(issue for issue in batch if 'pull_request' not in issue and
                      any(label['name'] == 'task' for label in issue['labels']))
        if len(batch) < 100:
            break
    else:
        raise RuntimeError('Too many issue pages; refusing a partial sync')
    tasks = []
    for issue in issues:
        status = issue_status(issue)
        if status is None:
            continue
        owners = [key for key in OWNERS if any(label['name'] == 'owner:' + key for label in issue['labels'])]
        if len(owners) != 1:
            raise RuntimeError(f'Issue #{issue["number"]} needs exactly one owner')
        owner = owners[0]
        account = config['members'].get(owner)
        owner_text = OWNERS[owner] + (f' (@{account})' if account else '')
        tasks.append((issue, status, owner_text))

    items = {}
    cursor = None
    for _ in range(100):
        result = graphql(gh, 'query($id:ID!,$after:String){node(id:$id){... on ProjectV2{items(first:100,after:$after){'
                         'pageInfo{hasNextPage endCursor} nodes{id content{... on Issue{id}} '
                         'fieldValues(first:30){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{id}}} '
                         '... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2Field{id}}}}}}}}}}',
                         id=config['id'], after=cursor)['node']['items']
        for item in result['nodes']:
            if item['content'] and item['content'].get('id'):
                values = {value['field']['id']: value.get('name', value.get('text'))
                          for value in item['fieldValues']['nodes'] if value.get('field')}
                items[item['content']['id']] = (item['id'], values)
        if not result['pageInfo']['hasNextPage']:
            break
        cursor = result['pageInfo']['endCursor']
    else:
        raise RuntimeError('Too many Project pages; refusing a partial sync')

    changes = 0
    for issue, status, owner in tasks:
        item_id, current = items.get(issue['node_id'], (None, {}))
        if not item_id and not args.dry_run:
            item_id = graphql(gh, 'mutation($input:AddProjectV2ItemByIdInput!){addProjectV2ItemById(input:$input){item{id}}}',
                              input={'projectId': config['id'], 'contentId': issue['node_id']})['addProjectV2ItemById']['item']['id']
        for field, expected, value in [(status_field, names[status], {'singleSelectOptionId': options[names[status]]}),
                                       (owner_field, owner, {'text': owner})]:
            if current.get(field['id']) == expected:
                continue
            changes += 1
            if not args.dry_run:
                graphql(gh, 'mutation($input:UpdateProjectV2ItemFieldValueInput!){updateProjectV2ItemFieldValue(input:$input){projectV2Item{id}}}',
                        input={'projectId': config['id'], 'itemId': item_id, 'fieldId': field['id'], 'value': value})
        print(f'#{issue["number"]}: {names[status]} / {owner}')
    print(f'{len(tasks)} tasks; {changes} field changes' + (' needed (dry run)' if args.dry_run else ' applied'))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, StopIteration, KeyError) as error:
        raise SystemExit(f'Project sync failed: {error}') from None
